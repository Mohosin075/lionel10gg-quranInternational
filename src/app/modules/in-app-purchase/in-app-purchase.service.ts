import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { User } from '../user/user.model';
import { InAppPurchase } from './in-app-purchase.model';
import { InAppPurchasePlan } from './in-app-purchase-package.model';
import { nativeIapService } from './native-iap.service';
import { VerifyPurchaseRequest, IInAppPurchasePlan, IInAppPurchase } from './in-app-purchase.interface';

class InAppPurchaseService {
  async getAvailablePlans(): Promise<IInAppPurchasePlan[]> {
    return await InAppPurchasePlan.find({ isActive: true }).sort({ priority: 1 });
  }

  async getPlanById(planId: string): Promise<IInAppPurchasePlan> {
    const plan = await InAppPurchasePlan.findById(planId);
    if (!plan) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Package not found');
    }
    return plan;
  }

  async verifyPurchase(userId: string, data: VerifyPurchaseRequest): Promise<IInAppPurchase> {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    const plan = await InAppPurchasePlan.findById(data.planId);
    if (!plan) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Package not found');
    }

    let verificationResult;
    
    if (data.platform === 'ios') {
      verificationResult = await nativeIapService.verifyAppleReceipt(
        data.receiptData,
        data.productId
      );
    } else if (data.platform === 'android') {
      verificationResult = await nativeIapService.verifyGoogleReceipt(
        data.receiptData,
        data.productId
      );
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid platform');
    }

    if (!verificationResult.isValid) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid receipt');
    }

    // Check if this transaction has already been processed
    const existingPurchase = await InAppPurchase.findOne({
      transactionId: verificationResult.transactionId,
    });

    if (existingPurchase) {
      return existingPurchase; // Return existing to make it idempotent
    }

    // Create the purchase record
    const purchase = await InAppPurchase.create({
      userId: new Types.ObjectId(userId),
      planId: plan._id,
      platform: data.platform,
      transactionId: verificationResult.transactionId,
      receiptData: data.receiptData,
      status: 'active',
      purchaseDate: verificationResult.purchaseDate,
      // If it's a subscription package instead of one-time, calculate expiry
      expiryDate: plan.interval === 'month' 
        ? new Date(verificationResult.purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
        : undefined
    });

    // TODO: Add any business logic here (e.g., adding coins to user account)
    
    return purchase;
  }

  async getUserPurchases(userId: string): Promise<IInAppPurchase[]> {
    return await InAppPurchase.find({ userId }).populate('planId').sort({ purchaseDate: -1 });
  }
}

export const inAppPurchaseService = new InAppPurchaseService();
