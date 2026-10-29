import { StatusCodes } from 'http-status-codes'
import { createHash } from 'crypto'
import { Types } from 'mongoose'
import ApiError from '../../../errors/ApiError'
import { User } from '../user/user.model'
import { InAppPurchase } from './in-app-purchase.model'
import { InAppPurchasePlan } from './in-app-purchase-package.model'
import { nativeIapService } from './native-iap.service'
import {
  VerifyPurchaseRequest,
  IInAppPurchasePlan,
  IInAppPurchase,
} from './in-app-purchase.interface'

class InAppPurchaseService {
  async getAvailablePlans(): Promise<IInAppPurchasePlan[]> {
    return await InAppPurchasePlan.find({ isActive: true }).sort({
      priority: 1,
    })
  }

  async getPlanById(planId: string): Promise<IInAppPurchasePlan> {
    const plan = await InAppPurchasePlan.findById(planId)
    if (!plan) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Package not found')
    }
    return plan
  }

  async verifyPurchase(
    userId: string,
    data: VerifyPurchaseRequest,
  ): Promise<IInAppPurchase> {
    const user = await User.findById(userId)
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
    }

    const plan = await InAppPurchasePlan.findById(data.planId)
    if (!plan) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Package not found')
    }

    let verificationResult
    const expectedProductId =
      data.platform === 'ios' ? plan.appleProductId : plan.googleProductId
    if (
      !plan.isActive ||
      !expectedProductId ||
      data.productId !== expectedProductId
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This store product is not configured for the selected plan',
      )
    }

    if (data.platform === 'ios') {
      verificationResult = await nativeIapService.verifyAppleReceipt(
        data.receiptData,
        data.productId,
      )
    } else if (data.platform === 'android') {
      verificationResult = await nativeIapService.verifyGoogleReceipt(
        data.receiptData,
        data.productId,
      )
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid platform')
    }

    if (
      !verificationResult.isValid ||
      !verificationResult.transactionId ||
      verificationResult.productId !== expectedProductId
    ) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid receipt')
    }

    // Check if this transaction has already been processed
    const ownershipKey = createHash('sha256')
      .update(
        data.platform +
          ':' +
          (verificationResult.originalTransactionId ||
            verificationResult.transactionId),
      )
      .digest('hex')
    const existingPurchase = await InAppPurchase.findOne({
      $or: [
        { transactionId: verificationResult.transactionId },
        { ownershipKey },
      ],
    })

    const expiryDate = verificationResult.expiryDate
    if (
      !expiryDate ||
      !Number.isFinite(expiryDate.getTime()) ||
      expiryDate.getTime() <= Date.now()
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'The store subscription has expired or has no verified expiry',
      )
    }
    if (
      existingPurchase &&
      (existingPurchase.userId.toString() !== userId ||
        existingPurchase.planId.toString() !== plan._id!.toString() ||
        existingPurchase.platform !== data.platform)
    ) {
      throw new ApiError(
        StatusCodes.CONFLICT,
        'This purchase is already associated with another account or plan',
      )
    }

    const activatePremium = async () => {
      await User.findByIdAndUpdate(userId, {
        subscriptionStatus: 'active',
        subscriptionTier: 'premium',
        subscriptionExpiresAt: expiryDate,
      })
    }

    if (existingPurchase) {
      existingPurchase.expiryDate = expiryDate
      existingPurchase.ownershipKey = ownershipKey
      existingPurchase.status = 'active'
      await existingPurchase.save()
      await activatePremium()
      return existingPurchase
    }

    let purchase
    try {
      purchase = await InAppPurchase.create({
        userId: new Types.ObjectId(userId),
        planId: plan._id,
        platform: data.platform,
        transactionId: verificationResult.transactionId,
        ownershipKey,
        receiptData: data.receiptData,
        status: 'active',
        purchaseDate: verificationResult.purchaseDate,
        expiryDate,
      })
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          'Purchase has already been processed; restore it from its original account',
        )
      }
      throw error
    }

    await activatePremium()

    return purchase
  }

  async getUserPurchases(userId: string): Promise<IInAppPurchase[]> {
    return await InAppPurchase.find({ userId })
      .populate('planId')
      .sort({ purchaseDate: -1 })
  }
}

export const inAppPurchaseService = new InAppPurchaseService()
