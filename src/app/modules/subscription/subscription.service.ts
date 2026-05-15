/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes'
import { Types } from 'mongoose'
import ApiError from '../../../errors/ApiError'
import { User } from '../user/user.model'
import { Subscription } from './subscription.model'
import { SubscriptionPlan } from './subscription-plan.model'
import { stripeService } from './stripe.service'
import { emailNotificationService } from './email-notification.service'
import {
  ISubscription,
  ISubscriptionPlan,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  SubscriptionResponse,
  SubscriptionStatus,
} from './subscription.interface'

class SubscriptionService {
  async getAvailablePlans(): Promise<ISubscriptionPlan[]> {
    try {
      const query: any = { isActive: true }

      const plans = await SubscriptionPlan.find(query).sort({
        priority: 1,
        price: 1,
      })
      return plans
    } catch (error) {
      console.error('Error fetching subscription plans:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to fetch subscription plans',
      )
    }
  }

  async getPlanById(planId: string): Promise<ISubscriptionPlan> {
    try {
      const plan = await SubscriptionPlan.findById(planId)
      if (!plan) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription plan not found')
      }
      return plan
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error fetching subscription plan:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to fetch subscription plan',
      )
    }
  }

  async createSubscription(
    userId: string,
    request: CreateSubscriptionRequest,
  ): Promise<SubscriptionResponse> {
    try {
      const user = await User.findById(userId).select('+email')
      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
      }

      const plan = await this.getPlanById(request.planId)
      const existingSubscription = await Subscription.findActiveByUserId(userId)
      if (existingSubscription) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          'User already has an active subscription',
        )
      }

      let stripeCustomerId: string
      const existingCustomer = await Subscription.findOne({ userId }).select(
        'stripeCustomerId',
      )

      if (existingCustomer?.stripeCustomerId) {
        stripeCustomerId = existingCustomer.stripeCustomerId
      } else {
        const stripeCustomer = await stripeService.createCustomer(
          user.email!,
          (user as any).fullName || user.name,
          { userId: userId.toString() },
        )
        stripeCustomerId = stripeCustomer.id
      }

      if (request.paymentMethodId) {
        await stripeService.attachPaymentMethod(
          request.paymentMethodId,
          stripeCustomerId,
        )
        await stripeService.setDefaultPaymentMethod(
          stripeCustomerId,
          request.paymentMethodId,
        )
      }

      console.log('Metadata', userId, request.planId)
      const stripeSubscription = await stripeService.createSubscription({
        customerId: stripeCustomerId,
        priceId: plan.stripePriceId,
        paymentMethodId: request.paymentMethodId,
        metadata: {
          userId: userId.toString(),
          planId: request.planId,
        },
      })

      const subscriptionItem = stripeSubscription.items.data[0]
      const currentPeriodStart =
        (stripeSubscription as any).current_period_start ||
        (subscriptionItem as any).current_period_start
      const currentPeriodEnd =
        (stripeSubscription as any).current_period_end ||
        (subscriptionItem as any).current_period_end

      const subscription = new Subscription({
        userId: new Types.ObjectId(userId),
        planId: new Types.ObjectId(request.planId),
        stripeCustomerId,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: plan.stripePriceId,
        status: stripeSubscription.status,
        currentPeriodStart: currentPeriodStart
          ? new Date(currentPeriodStart * 1000)
          : new Date(),
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata: new Map(Object.entries(stripeSubscription.metadata || {})),
      })

      await subscription.save()

      await User.findByIdAndUpdate(userId, {
        stripeCustomerId,
        subscriptionStatus: stripeSubscription.status,
        subscriptionTier: this.getSubscriptionTier(plan.name),
        subscriptionExpiresAt: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      await emailNotificationService.sendSubscriptionWelcomeEmail(
        subscription,
        plan,
        false,
      )

      let clientSecret: string | undefined

      console.log('--- Debugging Subscription ---')
      console.log('Subscription Status:', stripeSubscription.status)

      if (
        stripeSubscription.latest_invoice &&
        typeof stripeSubscription.latest_invoice === 'object'
      ) {
        const invoice = stripeSubscription.latest_invoice as any
        if (
          invoice.payment_intent &&
          typeof invoice.payment_intent === 'object'
        ) {
          clientSecret =
            (invoice.payment_intent as any).client_secret || undefined
          console.log('Client Secret found in latest_invoice.payment_intent')
        } else if (
          invoice.payment_intent &&
          typeof invoice.payment_intent === 'string'
        ) {
          console.log(
            'Payment Intent found as string, but not expanded:',
            invoice.payment_intent,
          )
        }
      }

      console.log('Final clientSecret:', clientSecret)
      console.log('------------------------------')

      console.log(
        `Subscription created for user ${userId}: ${subscription._id}`,
      )

      return {
        subscription: await subscription.populate(['planId']),
        clientSecret,
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error creating subscription:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create subscription',
      )
    }
  }

  async getUserSubscription(userId: string): Promise<ISubscription | null> {
    try {
      const subscription = await Subscription.findActiveByUserId(userId)
      return subscription
    } catch (error) {
      console.error('Error fetching user subscription:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to fetch subscription',
      )
    }
  }

  async getAllSubscriptions(query: Record<string, unknown>) {
    try {
      const result = await Subscription.find().populate(['userId', 'planId'])
      const total = await Subscription.countDocuments()
      
      return {
        meta: {
          page: 1,
          limit: 10,
          total,
          totalPages: Math.ceil(total / 10),
        },
        result,
      }
    } catch (error) {
      console.error('Error fetching all subscriptions:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to fetch all subscriptions',
      )
    }
  }

  async updateSubscription(
    userId: string,
    subscriptionId: string,
    request: UpdateSubscriptionRequest,
  ): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        userId: new Types.ObjectId(userId),
      })

      if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found')
      }

      const updateParams: any = {}

      if (request.planId) {
        const newPlan = await this.getPlanById(request.planId)
        const stripeSubscription = await stripeService.getSubscription(
          subscription.stripeSubscriptionId,
        )
        const subscriptionItemId = stripeSubscription.items.data[0].id

        await stripeService.updateSubscription(
          subscription.stripeSubscriptionId,
          {
            items: [
              {
                id: subscriptionItemId,
                price: newPlan.stripePriceId,
              },
            ],
            proration_behavior: 'create_prorations',
          },
        )

        updateParams.planId = new Types.ObjectId(request.planId)
        updateParams.stripePriceId = newPlan.stripePriceId

        await User.findByIdAndUpdate(userId, {
          subscriptionTier: this.getSubscriptionTier(newPlan.name),
        })

        const { emailNotificationService: emailService } = await import(
          './email-notification.service'
        )
        await emailService.sendPlanChangeEmail(
          subscription,
          newPlan,
          stripeSubscription.items.data[0].price,
        )
      }

      if (request.cancelAtPeriodEnd !== undefined) {
        await stripeService.updateSubscription(
          subscription.stripeSubscriptionId,
          {
            cancel_at_period_end: request.cancelAtPeriodEnd,
          },
        )

        updateParams.cancelAtPeriodEnd = request.cancelAtPeriodEnd
        if (request.cancelAtPeriodEnd) {
          updateParams.canceledAt = new Date()
        }
      }

      const updatedSubscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        updateParams,
        { new: true },
      ).populate(['planId'])

      console.log(`Subscription updated: ${subscriptionId}`)
      return updatedSubscription!
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error updating subscription:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to update subscription',
      )
    }
  }

  async cancelSubscription(
    userId: string,
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        userId: new Types.ObjectId(userId),
      })

      if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found')
      }

      await stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        cancelAtPeriodEnd,
      )

      const updateData: any = {
        cancelAtPeriodEnd,
        canceledAt: new Date(),
      }

      if (!cancelAtPeriodEnd) {
        updateData.status = 'canceled'
        updateData.endedAt = new Date()

        await User.findByIdAndUpdate(userId, {
          subscriptionStatus: 'canceled',
        })
      }

      const updatedSubscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        updateData,
        { new: true },
      ).populate(['planId'])

      console.log(`Subscription canceled: ${subscriptionId}`)
      return updatedSubscription!
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error canceling subscription:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to cancel subscription',
      )
    }
  }

  async reactivateSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        userId: new Types.ObjectId(userId),
      })

      if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found')
      }

      if (subscription.status === 'canceled' && subscription.endedAt) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Subscription has already ended and cannot be reactivated. Please start a new subscription.',
        )
      }

      if (!subscription.cancelAtPeriodEnd) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Subscription is not set to cancel and is already active.',
        )
      }

      await stripeService.reactivateSubscription(
        subscription.stripeSubscriptionId,
      )

      const updatedSubscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        {
          cancelAtPeriodEnd: false,
          canceledAt: null,
          resumedAt: new Date(),
        },
        { new: true },
      ).populate(['planId'])

      const plan = updatedSubscription?.planId as unknown as ISubscriptionPlan
      if (plan) {
        await emailNotificationService.sendSubscriptionWelcomeEmail(
          updatedSubscription!,
          plan,
          false,
        )
      }

      console.log(`Subscription reactivated: ${subscriptionId}`)
      return updatedSubscription!
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error reactivating subscription:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to reactivate subscription',
      )
    }
  }

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const subscription = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
        status: { $in: ['active'] },
      }).populate('planId')

      if (!subscription) {
        return {
          isActive: false,
          isTrialing: false,
          isPastDue: false,
          isCanceled: false,
          daysUntilExpiry: 0,
        }
      }

      const now = new Date()
      const endDate = subscription.currentPeriodEnd
      const daysUntilExpiry = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )

      let currentPlan: ISubscriptionPlan | undefined
      if (
        subscription.planId &&
        typeof subscription.planId === 'object' &&
        'name' in subscription.planId &&
        'description' in subscription.planId &&
        'price' in subscription.planId
      ) {
        currentPlan = subscription.planId as unknown as ISubscriptionPlan
      } else {
        currentPlan = await this.getPlanById(subscription.planId.toString())
      }

      return {
        isActive: ['active'].includes(subscription.status),
        isTrialing: false,
        isPastDue: subscription.status === 'past_due',
        isCanceled: subscription.status === 'canceled',
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        currentPlan,
      }
    } catch (error) {
      console.error('Error getting subscription status:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to get subscription status',
      )
    }
  }

  async createCheckoutSession(
    userId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string }> {
    try {
      const user = await User.findById(userId).select('+email')
      console.log({ user })
      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
      }

      const plan = await this.getPlanById(planId)

      let stripeCustomerId: string
      const existingCustomer = await Subscription.findOne({ userId }).select(
        'stripeCustomerId',
      )

      if (existingCustomer?.stripeCustomerId) {
        stripeCustomerId = existingCustomer.stripeCustomerId
      } else {
        const stripeCustomer = await stripeService.createCustomer(
          user.email!,
          (user as any).fullName || user.name,
          { userId: userId.toString() },
        )
        stripeCustomerId = stripeCustomer.id
      }

      const session = await stripeService.createCheckoutSession({
        customerId: stripeCustomerId,
        priceId: plan.stripePriceId,
        successUrl,
        cancelUrl,
        metadata: {
          userId: userId.toString(),
          planId,
        },
      })

      return {
        sessionId: session.id,
        url: session.url!,
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error creating checkout session:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create checkout session',
      )
    }
  }

  async createSubscriptionPlan(
    planData: Omit<ISubscriptionPlan, '_id' | 'createdAt' | 'updatedAt'> &
      Partial<Pick<ISubscriptionPlan, 'maxPhotos' | 'priority'>>,
  ): Promise<ISubscriptionPlan> {
    try {
      const existingPlan = await SubscriptionPlan.findOne({
        name: { $regex: `^${planData.name.trim()}$`, $options: 'i' },
      })
      if (existingPlan) {
        throw new ApiError(
          StatusCodes.CONFLICT,
          `Subscription plan "${planData.name}" already exists`,
        )
      }

      const maxPhotos = planData.maxPhotos ?? 1
      const priority = planData.priority ?? 0

      const stripeProduct = await stripeService.createProduct({
        name: planData.name,
        description: planData.description,
        metadata: {
          maxPhotos: maxPhotos.toString(),
        },
      })

      const stripePrice = await stripeService.createPrice({
        productId: stripeProduct.id,
        unitAmount: planData.price * 100,
        currency: planData.currency,
        interval: planData.interval,
        intervalCount: planData.intervalCount,
        metadata: {
          planName: planData.name,
        },
      })

      const plan = new SubscriptionPlan({
        ...planData,
        maxPhotos,
        priority,
        stripeProductId: stripeProduct.id,
        stripePriceId: stripePrice.id,
      })

      await plan.save()

      console.log(`Subscription plan created: ${plan._id}`)
      return plan
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error creating subscription plan:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create subscription plan',
      )
    }
  }

  async updateSubscriptionPlan(
    planId: string,
    updateData: Partial<ISubscriptionPlan>,
  ): Promise<ISubscriptionPlan> {
    try {
      const plan = await SubscriptionPlan.findById(planId)
      if (!plan) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription plan not found')
      }

      if (updateData.name || updateData.description) {
        await stripeService.updateProduct(plan.stripeProductId, {
          name: updateData.name || plan.name,
          description: updateData.description || plan.description,
        })
      }

      if (updateData.price && updateData.price !== plan.price) {
        const newStripePrice = await stripeService.createPrice({
          productId: plan.stripeProductId,
          unitAmount: updateData.price * 100,
          currency: updateData.currency || plan.currency,
          interval: updateData.interval || plan.interval,
          intervalCount: updateData.intervalCount || plan.intervalCount,
        })

        await stripeService.archivePrice(plan.stripePriceId)
        updateData.stripePriceId = newStripePrice.id
      }

      const updatedPlan = await SubscriptionPlan.findByIdAndUpdate(
        planId,
        updateData,
        { new: true },
      )

      console.log(`Subscription plan updated: ${planId}`)
      return updatedPlan!
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error updating subscription plan:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to update subscription plan',
      )
    }
  }

  async deleteSubscriptionPlan(planId: string): Promise<ISubscriptionPlan> {
    try {
      const plan = await SubscriptionPlan.findById(planId)
      if (!plan) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription plan not found')
      }

      const activeSubscriptions = await Subscription.countDocuments({
        planId: new Types.ObjectId(planId),
        status: { $in: ['active'] },
      })

      if (activeSubscriptions > 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Cannot delete a plan with active subscriptions',
        )
      }

      await stripeService.archivePrice(plan.stripePriceId)
      await stripeService.updateProduct(plan.stripeProductId, { active: false })

      const deletedPlan = await SubscriptionPlan.findByIdAndUpdate(
        planId,
        { isActive: false },
        { new: true },
      )

      return deletedPlan!
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error deleting subscription plan:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to delete subscription plan',
      )
    }
  }

  async getSubscriptionAnalytics(filters?: {
    startDate?: Date
    endDate?: Date
    planId?: string
    status?: string
  }): Promise<any> {
    try {
      const matchStage: any = {}

      if (filters?.startDate || filters?.endDate) {
        matchStage.createdAt = {}
        if (filters.startDate) matchStage.createdAt.$gte = filters.startDate
        if (filters.endDate) matchStage.createdAt.$lte = filters.endDate
      }

      if (filters?.planId) {
        matchStage.planId = new Types.ObjectId(filters.planId)
      }

      if (filters?.status) {
        matchStage.status = filters.status
      }

      const analytics = await Subscription.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSubscriptions: { $sum: 1 },
            activeSubscriptions: {
              $sum: {
                $cond: [{ $in: ['$status', ['active']] }, 1, 0],
              },
            },
            trialingSubscriptions: { $sum: 0 },
            canceledSubscriptions: {
              $sum: { $cond: [{ $eq: ['$status', 'canceled'] }, 1, 0] },
            },
            pastDueSubscriptions: {
              $sum: { $cond: [{ $eq: ['$status', 'past_due'] }, 1, 0] },
            },
          },
        },
      ])

      const mrrData = await Subscription.aggregate([
        {
          $match: {
            status: { $in: ['active'] },
            ...matchStage,
          },
        },
        {
          $lookup: {
            from: 'subscriptionplans',
            localField: 'planId',
            foreignField: '_id',
            as: 'plan',
          },
        },
        { $unwind: '$plan' },
        {
          $group: {
            _id: null,
            monthlyRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$plan.interval', 'month'] },
                  '$plan.price',
                  { $divide: ['$plan.price', 12] },
                ],
              },
            },
          },
        },
      ])

      const result = analytics[0] || {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        trialingSubscriptions: 0,
        canceledSubscriptions: 0,
        pastDueSubscriptions: 0,
      }

      result.monthlyRevenue = mrrData[0]?.monthlyRevenue || 0
      result.churnRate =
        result.totalSubscriptions > 0
          ? (
              (result.canceledSubscriptions / result.totalSubscriptions) *
              100
            ).toFixed(2)
          : 0

      return result
    } catch (error) {
      console.error('Error getting subscription analytics:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to get subscription analytics',
      )
    }
  }

  async retryFailedPayment(subscriptionId: string): Promise<void> {
    try {
      const subscription = await Subscription.findById(subscriptionId)
      if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found')
      }

      const stripeSubscription = await stripeService.getSubscriptionExpanded(
        subscription.stripeSubscriptionId,
      )

      if (
        stripeSubscription.latest_invoice &&
        typeof stripeSubscription.latest_invoice === 'object'
      ) {
        const invoice = stripeSubscription.latest_invoice as any
        await stripeService.retryInvoicePayment(invoice.id)

        console.log(
          `Payment retry initiated for subscription: ${subscriptionId}`,
        )
      }
    } catch (error) {
      console.error('Error retrying failed payment:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to retry payment',
      )
    }
  }

  async pauseSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        userId: new Types.ObjectId(userId),
      })

      if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found')
      }

      await stripeService.pauseSubscription(subscription.stripeSubscriptionId)

      const updatedSubscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        { status: 'paused' },
        { new: true },
      ).populate(['planId'])

      console.log(`Subscription paused: ${subscriptionId}`)
      return updatedSubscription!
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error pausing subscription:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to pause subscription',
      )
    }
  }

  async resumeSubscription(
    userId: string,
    subscriptionId: string,
  ): Promise<ISubscription> {
    try {
      const subscription = await Subscription.findOne({
        _id: subscriptionId,
        userId: new Types.ObjectId(userId),
      })

      if (!subscription) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found')
      }

      await stripeService.resumeSubscription(subscription.stripeSubscriptionId)

      const updatedSubscription = await Subscription.findByIdAndUpdate(
        subscriptionId,
        { status: 'active' },
        { new: true },
      ).populate(['planId'])

      console.log(`Subscription resumed: ${subscriptionId}`)
      return updatedSubscription!
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error resuming subscription:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to resume subscription',
      )
    }
  }

  async createBillingPortalSession(
    userId: string,
    returnUrl: string,
  ): Promise<{ url: string }> {
    try {
      const user = await User.findById(userId)
      if (!user) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
      }

      const userWithStripe = user as any

      if (!userWithStripe.stripeCustomerId) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'User does not have a Stripe customer account',
        )
      }

      const session = await stripeService.createPortalSession(
        userWithStripe.stripeCustomerId,
        returnUrl,
      )

      console.log(`Billing portal session created for user: ${userId}`)
      return { url: session.url }
    } catch (error) {
      if (error instanceof ApiError) throw error
      console.error('Error creating billing portal session:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create billing portal session',
      )
    }
  }

  private getSubscriptionTier(planName: string): string {
    const name = planName.toLowerCase()
    if (name.includes('enterprise') || name.includes('pro')) {
      return 'premium'
    } else if (name.includes('basic') || name.includes('starter')) {
      return 'basic'
    }
    return 'free'
  }
}

export const subscriptionService = new SubscriptionService()
