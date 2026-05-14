/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes'
import { Types } from 'mongoose'
import ApiError from '../../../errors/ApiError'
import { stripeService } from './stripe.service'
import { Subscription } from './subscription.model'
import { SubscriptionPlan } from './subscription-plan.model'
import { User } from '../user/user.model'

class WebhookService {
  async processWebhookEvent(event: any): Promise<void> {
    try {
      const existingSubscription = await Subscription.findOne({
        lastWebhookEventId: event.id,
      })

      if (existingSubscription) {
        console.log(`Webhook event already processed: ${event.id}`)
        return
      }

      console.log(`Processing webhook event: ${event.type} - ${event.id}`)

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(
            event.data.object,
            event.id,
          )
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(
            event.data.object,
            event.id,
          )
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(
            event.data.object,
            event.id,
          )
          break

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(
            event.data.object,
            event.id,
          )
          break

        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(
            event.data.object,
            event.id,
          )
          break

        case 'invoice.payment_failed':
          await this.handlePaymentFailed(
            event.data.object,
            event.id,
          )
          break

        case 'invoice.upcoming':
          await this.handleUpcomingInvoice(
            event.data.object,
            event.id,
          )
          break

        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(
            event.data.object,
            event.id,
          )
          break

        case 'product.updated':
          await this.handleProductUpdated(
            event.data.object,
            event.id,
          )
          break

        case 'product.deleted':
          await this.handleProductDeleted(
            event.data.object,
            event.id,
          )
          break

        case 'price.updated':
          await this.handlePriceUpdated(
            event.data.object,
            event.id,
          )
          break

        case 'price.deleted':
          await this.handlePriceDeleted(
            event.data.object,
            event.id,
          )
          break

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(
            event.data.object,
          )
          break

        case 'customer.updated':
          await this.handleCustomerUpdated(
            event.data.object,
          )
          break

        case 'customer.deleted':
          await this.handleCustomerDeleted(
            event.data.object,
            event.id,
          )
          break

        case 'charge.dispute.created':
          await this.handleDisputeCreated(
            event.data.object,
            event.id,
          )
          break

        case 'invoice.created':
          await this.handleInvoiceCreated(
            event.data.object,
          )
          break

        case 'invoice.finalized':
          await this.handleInvoiceFinalized(
            event.data.object,
            event.id,
          )
          break

        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(
            event.data.object,
            event.id,
          )
          break

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(
            event.data.object,
            event.id,
          )
          break

        case 'customer.subscription.paused':
          await this.handleSubscriptionPaused(
            event.data.object,
            event.id,
          )
          break

        case 'customer.subscription.resumed':
          await this.handleSubscriptionResumed(
            event.data.object,
            event.id,
          )
          break

        case 'setup_intent.succeeded':
          await this.handleSetupIntentSucceeded(
            event.data.object,
          )
          break

        case 'payment_method.automatically_updated':
          await this.handlePaymentMethodUpdated(
            event.data.object,
          )
          break

        default:
          console.log(`Unhandled webhook event type: ${event.type}`)
      }
    } catch (error) {
      console.error(`Error processing webhook event ${event.id}:`, error)
      throw error
    }
  }

  private async handleSubscriptionCreated(
    stripeSubscription: any,
    eventId: string,
  ): Promise<void> {
    try {
      const userId = stripeSubscription.metadata?.userId
      if (!userId) {
        console.error('No userId in subscription metadata')
        return
      }

      const existingSubscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      })

      if (existingSubscription) {
        console.log(`Subscription already exists: ${stripeSubscription.id}`)
        return
      }

      const priceId =
        typeof stripeSubscription.items.data[0].price === 'string'
          ? stripeSubscription.items.data[0].price
          : stripeSubscription.items.data[0].price.id

      const plan = await SubscriptionPlan.findOne({
        stripePriceId: priceId,
      })

      if (!plan) {
        console.error(`Plan not found for price ID: ${priceId}`)
        return
      }

      const subscriptionItem = stripeSubscription.items.data[0]
      const currentPeriodStart =
        (stripeSubscription as any).current_period_start ||
        (subscriptionItem as any).current_period_start
      const currentPeriodEnd =
        (stripeSubscription as any).current_period_end ||
        (subscriptionItem as any).current_period_end

      const subscription = new Subscription({
        userId: new Types.ObjectId(userId),
        planId: plan._id,
        stripeCustomerId: stripeSubscription.customer as string,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0].price.id,
        status: stripeSubscription.status,
        currentPeriodStart: currentPeriodStart
          ? new Date(currentPeriodStart * 1000)
          : new Date(),
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        trialStart: stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null,
        trialEnd: stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        hasUsedTrial: !!stripeSubscription.trial_start,
        lastWebhookEventId: eventId,
        metadata: new Map(Object.entries(stripeSubscription.metadata || {})),
      })

      await subscription.save()

      await User.findByIdAndUpdate(userId, {
        stripeCustomerId: stripeSubscription.customer as string,
        subscriptionStatus: stripeSubscription.status,
        subscriptionTier: this.getSubscriptionTier(plan.name),
        trialUsed: !!stripeSubscription.trial_start,
        subscriptionExpiresAt: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })

      console.log(`Subscription created from webhook: ${subscription._id}`)
      console.log(`User profile updated for user: ${userId}`)
    } catch (error) {
      console.error('Error handling subscription created:', error)
      throw error
    }
  }

  private async handleSubscriptionUpdated(
    stripeSubscription: any,
    eventId: string,
  ): Promise<void> {
    try {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      })

      if (!subscription) {
        console.error(`Subscription not found: ${stripeSubscription.id}`)
        return
      }

      const subscriptionItem = stripeSubscription.items.data[0]
      const currentPeriodStart =
        (stripeSubscription as any).current_period_start ||
        (subscriptionItem as any).current_period_start
      const currentPeriodEnd =
        (stripeSubscription as any).current_period_end ||
        (subscriptionItem as any).current_period_end

      const updateData: any = {
        status: stripeSubscription.status,
        currentPeriodStart: currentPeriodStart
          ? new Date(currentPeriodStart * 1000)
          : undefined,
        currentPeriodEnd: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : undefined,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        lastWebhookEventId: eventId,
      }

      if (stripeSubscription.trial_start) {
        updateData.trialStart = new Date(stripeSubscription.trial_start * 1000)
        updateData.hasUsedTrial = true
      }

      if (stripeSubscription.trial_end) {
        updateData.trialEnd = new Date(stripeSubscription.trial_end * 1000)
      }

      if (stripeSubscription.canceled_at) {
        updateData.canceledAt = new Date(stripeSubscription.canceled_at * 1000)
      }

      if (stripeSubscription.ended_at) {
        updateData.endedAt = new Date(stripeSubscription.ended_at * 1000)
      }

      const newPrice = stripeSubscription.items.data[0].price
      const newPriceId = typeof newPrice === 'string' ? newPrice : newPrice.id

      let newTier: string | undefined
      if (subscription.stripePriceId !== newPriceId) {
        const newPlan = await SubscriptionPlan.findOne({
          stripePriceId: newPriceId,
        })
        if (newPlan) {
          updateData.planId = newPlan._id
          updateData.stripePriceId = newPriceId
          newTier = this.getSubscriptionTier(newPlan.name)
        }
      }

      await Subscription.findByIdAndUpdate(subscription._id, updateData)

      const userUpdate: any = {
        subscriptionStatus: stripeSubscription.status,
        subscriptionExpiresAt: currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000)
          : new Date((stripeSubscription as any).current_period_end * 1000),
        trialUsed: !!stripeSubscription.trial_start,
      }

      if (newTier) {
        userUpdate.subscriptionTier = newTier
      }

      await User.findByIdAndUpdate(subscription.userId, userUpdate)

      console.log(`Subscription updated from webhook: ${subscription._id}`)
      console.log(`User profile updated for user: ${subscription.userId}`)
    } catch (error) {
      console.error('Error handling subscription updated:', error)
      throw error
    }
  }

  private async handleSubscriptionDeleted(
    stripeSubscription: any,
    eventId: string,
  ): Promise<void> {
    try {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      })

      if (!subscription) {
        console.error(`Subscription not found: ${stripeSubscription.id}`)
        return
      }

      await Subscription.findByIdAndUpdate(subscription._id, {
        status: 'canceled',
        endedAt: new Date(),
        lastWebhookEventId: eventId,
      })

      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionStatus: 'canceled',
        subscriptionTier: 'free',
      })

      console.log(`Subscription deleted from webhook: ${subscription._id}`)
    } catch (error) {
      console.error('Error handling subscription deleted:', error)
      throw error
    }
  }

  private async handleTrialWillEnd(
    stripeSubscription: any,
    eventId: string,
  ): Promise<void> {
    try {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      }).populate(['userId', 'planId'])

      if (!subscription) {
        console.error(`Subscription not found: ${stripeSubscription.id}`)
        return
      }

      await Subscription.findByIdAndUpdate(subscription._id, {
        lastWebhookEventId: eventId,
      })

      console.log(
        `Trial will end notification sent for subscription: ${subscription._id}`,
      )
    } catch (error) {
      console.error('Error handling trial will end:', error)
      throw error
    }
  }

  private async handlePaymentSucceeded(
    invoice: any,
    eventId: string,
  ): Promise<void> {
    try {
      const invoiceWithSubscription = invoice as any

      if (!invoiceWithSubscription.subscription) {
        console.log('Invoice not related to subscription')
        return
      }

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoiceWithSubscription.subscription as string,
      })

      if (!subscription) {
        console.error(
          `Subscription not found: ${invoiceWithSubscription.subscription}`,
        )
        return
      }

      const stripeSubscription = await stripeService.getSubscription(
        invoiceWithSubscription.subscription as string,
      )

      await Subscription.findByIdAndUpdate(subscription._id, {
        status: stripeSubscription.status,
        lastPaymentDate: new Date(invoice.status_transitions.paid_at! * 1000),
        paymentFailureCount: 0,
        lastWebhookEventId: eventId,
      })

      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionStatus: stripeSubscription.status,
      })

      console.log(`Payment succeeded for subscription: ${subscription._id}`)
    } catch (error) {
      console.error('Error handling payment succeeded:', error)
      throw error
    }
  }

  private async handlePaymentFailed(
    invoice: any,
    eventId: string,
  ): Promise<void> {
    try {
      const invoiceWithSubscription = invoice as any

      if (!invoiceWithSubscription.subscription) {
        console.log('Invoice not related to subscription')
        return
      }

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoiceWithSubscription.subscription as string,
      }).populate(['userId', 'planId'])

      if (!subscription) {
        console.error(
          `Subscription not found: ${invoiceWithSubscription.subscription}`,
        )
        return
      }

      const failureCount = subscription.paymentFailureCount + 1
      const newStatus = failureCount >= 3 ? 'unpaid' : 'past_due'

      await Subscription.findByIdAndUpdate(subscription._id, {
        status: newStatus,
        paymentFailureCount: failureCount,
        lastWebhookEventId: eventId,
      })

      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionStatus: newStatus,
      })

      console.log(
        `Payment failed for subscription: ${subscription._id} (attempt ${failureCount})`,
      )
    } catch (error) {
      console.error('Error handling payment failed:', error)
      throw error
    }
  }

  private async handleUpcomingInvoice(
    invoice: any,
    eventId: string,
  ): Promise<void> {
    try {
      const invoiceWithSubscription = invoice as any

      if (!invoiceWithSubscription.subscription) {
        console.log('Invoice not related to subscription')
        return
      }

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoiceWithSubscription.subscription as string,
      }).populate(['userId', 'planId'])

      if (!subscription) {
        console.error(
          `Subscription not found: ${invoiceWithSubscription.subscription}`,
        )
        return
      }

      await Subscription.findByIdAndUpdate(subscription._id, {
        nextPaymentDate: new Date(invoice.period_end * 1000),
        lastWebhookEventId: eventId,
      })

      console.log(
        `Upcoming invoice notification sent for subscription: ${subscription._id}`,
      )
    } catch (error) {
      console.error('Error handling upcoming invoice:', error)
      throw error
    }
  }

  private async handleCheckoutCompleted(
    session: any,
    eventId: string,
  ): Promise<void> {
    try {
      if (session.mode !== 'subscription') {
        console.log('Checkout session not for subscription')
        return
      }

      const userId = session.metadata?.userId
      if (!userId) {
        console.error('No userId in checkout session metadata')
        return
      }
      console.log('session', session)

      if (session.subscription) {
        const stripeSubscription = await stripeService.getSubscription(
          session.subscription as string,
        )

        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSubscription.id },
          {
            status: stripeSubscription.status,
            lastWebhookEventId: eventId,
          },
        )

        await User.findByIdAndUpdate(userId, {
          subscriptionStatus: stripeSubscription.status,
          stripeCustomerId: session.customer as string,
        })
      }

      console.log(`Checkout completed for user: ${userId}`)
    } catch (error) {
      console.error('Error handling checkout completed:', error)
      throw error
    }
  }

  private async handleProductUpdated(
    stripeProduct: any,
    eventId: string,
  ): Promise<void> {
    try {
      const plan = await SubscriptionPlan.findOne({
        stripeProductId: stripeProduct.id,
      })

      if (!plan) {
        console.warn(`Plan not found for Stripe product: ${stripeProduct.id}`)
        return
      }

      await SubscriptionPlan.findByIdAndUpdate(plan._id, {
        name: stripeProduct.name,
        description: stripeProduct.description || plan.description,
        isActive: stripeProduct.active,
        lastWebhookEventId: eventId,
      })

      console.log(`Plan updated from Stripe product webhook: ${plan._id}`)
    } catch (error) {
      console.error('Error handling product updated:', error)
      throw error
    }
  }

  private async handleProductDeleted(
    stripeProduct: any,
    eventId: string,
  ): Promise<void> {
    try {
      const plan = await SubscriptionPlan.findOne({
        stripeProductId: stripeProduct.id,
      })

      if (!plan) {
        console.warn(
          `Plan not found for deleted Stripe product: ${stripeProduct.id}`,
        )
        return
      }

      await SubscriptionPlan.findByIdAndUpdate(plan._id, {
        isActive: false,
        lastWebhookEventId: eventId,
      })

      const activeSubscriptions = await Subscription.find({
        planId: plan._id,
        status: { $in: ['active', 'trialing'] },
      })

      for (const subscription of activeSubscriptions) {
        try {
          await stripeService.cancelSubscription(
            subscription.stripeSubscriptionId,
            true,
          )
          console.log(
            `Canceled subscription due to product deletion: ${subscription._id}`,
          )
        } catch (error) {
          console.error(
            `Error canceling subscription ${subscription._id}:`,
            error,
          )
        }
      }

      console.log(`Plan deactivated due to product deletion: ${plan._id}`)
    } catch (error) {
      console.error('Error handling product deleted:', error)
      throw error
    }
  }

  private async handlePriceUpdated(
    stripePrice: any,
    eventId: string,
  ): Promise<void> {
    try {
      const plan = await SubscriptionPlan.findOne({
        stripePriceId: stripePrice.id,
      })

      if (!plan) {
        console.warn(`Plan not found for Stripe price: ${stripePrice.id}`)
        return
      }

      const updateData: any = {
        lastWebhookEventId: eventId,
      }

      if (stripePrice.unit_amount) {
        updateData.price = stripePrice.unit_amount / 100
      }

      if (stripePrice.currency) {
        updateData.currency = stripePrice.currency
      }

      if (stripePrice.recurring) {
        updateData.interval = stripePrice.recurring.interval
        updateData.intervalCount = stripePrice.recurring.interval_count
      }

      updateData.isActive = stripePrice.active

      await SubscriptionPlan.findByIdAndUpdate(plan._id, updateData)

      console.log(`Plan price updated from Stripe webhook: ${plan._id}`)
    } catch (error) {
      console.error('Error handling price updated:', error)
      throw error
    }
  }

  private async handlePriceDeleted(
    stripePrice: any,
    eventId: string,
  ): Promise<void> {
    try {
      const plan = await SubscriptionPlan.findOne({
        stripePriceId: stripePrice.id,
      })

      if (!plan) {
        console.warn(
          `Plan not found for deleted Stripe price: ${stripePrice.id}`,
        )
        return
      }

      await SubscriptionPlan.findByIdAndUpdate(plan._id, {
        isActive: false,
        lastWebhookEventId: eventId,
      })

      console.log(`Plan deactivated due to price deletion: ${plan._id}`)
    } catch (error) {
      console.error('Error handling price deleted:', error)
      throw error
    }
  }

  private async handlePaymentMethodAttached(
    paymentMethod: any,
  ): Promise<void> {
    try {
      console.log(
        `Payment method attached: ${paymentMethod.id} to customer: ${paymentMethod.customer}`,
      )
    } catch (error) {
      console.error('Error handling payment method attached:', error)
      throw error
    }
  }

  private async handleCustomerUpdated(
    stripeCustomer: any,
  ): Promise<void> {
    try {
      const subscription = await Subscription.findOne({
        stripeCustomerId: stripeCustomer.id,
      }).populate('userId')

      if (subscription && subscription.userId) {
        if (stripeCustomer.email) {
          await User.findByIdAndUpdate(subscription.userId, {
            email: stripeCustomer.email,
          })
        }
      }

      console.log(`Customer updated: ${stripeCustomer.id}`)
    } catch (error) {
      console.error('Error handling customer updated:', error)
      throw error
    }
  }

  private async handleCustomerDeleted(
    stripeCustomer: any,
    eventId: string,
  ): Promise<void> {
    try {
      const subscriptions = await Subscription.find({
        stripeCustomerId: stripeCustomer.id,
        status: { $in: ['active', 'trialing'] },
      })

      for (const subscription of subscriptions) {
        await Subscription.findByIdAndUpdate(subscription._id, {
          status: 'canceled',
          endedAt: new Date(),
          lastWebhookEventId: eventId,
        })
      }

      console.log(
        `Customer deleted and subscriptions canceled: ${stripeCustomer.id}`,
      )
    } catch (error) {
      console.error('Error handling customer deleted:', error)
      throw error
    }
  }

  private async handleDisputeCreated(
    dispute: any,
    eventId: string,
  ): Promise<void> {
    try {
      console.warn(
        `Dispute created: ${dispute.id} for charge: ${dispute.charge}`,
      )

      const subscription = await Subscription.findOne({
        stripeCustomerId: dispute.charge
          ? (dispute.charge as any).customer
          : null,
      }).populate(['userId', 'planId'])

      if (subscription) {
        await Subscription.findByIdAndUpdate(subscription._id, {
          status: 'unpaid',
          lastWebhookEventId: eventId,
        })

        console.error(
          `DISPUTE ALERT: Subscription ${subscription._id} suspended due to dispute ${dispute.id}`,
        )
      }
    } catch (error) {
      console.error('Error handling dispute created:', error)
      throw error
    }
  }

  private async handleInvoiceCreated(
    invoice: any,
  ): Promise<void> {
    try {
      const invoiceWithSubscription = invoice as any
      if (!invoiceWithSubscription.subscription) return

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoiceWithSubscription.subscription as string,
      })

      if (subscription) {
        console.log(`Invoice created for subscription: ${subscription._id}`)
      }
    } catch (error) {
      console.error('Error handling invoice created:', error)
      throw error
    }
  }

  private async handleInvoiceFinalized(
    invoice: any,
    eventId: string,
  ): Promise<void> {
    try {
      const invoiceWithSubscription = invoice as any
      if (!invoiceWithSubscription.subscription) return

      const subscription = await Subscription.findOne({
        stripeSubscriptionId: invoiceWithSubscription.subscription as string,
      })

      if (subscription) {
        await Subscription.findByIdAndUpdate(subscription._id, {
          nextPaymentDate: new Date(invoice.period_end * 1000),
          lastWebhookEventId: eventId,
        })

        console.log(`Invoice finalized for subscription: ${subscription._id}`)
      }
    } catch (error) {
      console.error('Error handling invoice finalized:', error)
      throw error
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: any,
    eventId: string,
  ): Promise<void> {
    try {
      console.log(`Payment intent succeeded: ${paymentIntent.id}`)

      if (paymentIntent.customer) {
        const subscription = await Subscription.findOne({
          stripeCustomerId: paymentIntent.customer as string,
        })

        if (subscription) {
          await Subscription.findByIdAndUpdate(subscription._id, {
            paymentFailureCount: 0,
            lastWebhookEventId: eventId,
          })
        }
      }
    } catch (error) {
      console.error('Error handling payment intent succeeded:', error)
      throw error
    }
  }

  private async handlePaymentIntentFailed(
    paymentIntent: any,
    eventId: string,
  ): Promise<void> {
    try {
      console.warn(`Payment intent failed: ${paymentIntent.id}`)

      if (paymentIntent.customer) {
        const subscription = await Subscription.findOne({
          stripeCustomerId: paymentIntent.customer as string,
        })

        if (subscription) {
          const failureCount = subscription.paymentFailureCount + 1

          await Subscription.findByIdAndUpdate(subscription._id, {
            paymentFailureCount: failureCount,
            lastWebhookEventId: eventId,
          })

          if (failureCount >= 3) {
            console.error(
              `CRITICAL: Multiple payment failures for subscription ${subscription._id}`,
            )
          }
        }
      }
    } catch (error) {
      console.error('Error handling payment intent failed:', error)
      throw error
    }
  }

  private async handleSubscriptionPaused(
    stripeSubscription: any,
    eventId: string,
  ): Promise<void> {
    try {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      })

      if (subscription) {
        await Subscription.findByIdAndUpdate(subscription._id, {
          status: 'paused',
          pausedAt: new Date(),
          lastWebhookEventId: eventId,
        })

        await User.findByIdAndUpdate(subscription.userId, {
          subscriptionStatus: 'paused',
        })

        console.log(`Subscription paused: ${subscription._id}`)
      }
    } catch (error) {
      console.error('Error handling subscription paused:', error)
      throw error
    }
  }

  private async handleSubscriptionResumed(
    stripeSubscription: any,
    eventId: string,
  ): Promise<void> {
    try {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
      })

      if (subscription) {
        await Subscription.findByIdAndUpdate(subscription._id, {
          status: stripeSubscription.status,
          resumedAt: new Date(),
          lastWebhookEventId: eventId,
        })

        await User.findByIdAndUpdate(subscription.userId, {
          subscriptionStatus: stripeSubscription.status,
        })

        console.log(`Subscription resumed: ${subscription._id}`)
      }
    } catch (error) {
      console.error('Error handling subscription resumed:', error)
      throw error
    }
  }

  private async handleSetupIntentSucceeded(
    setupIntent: any,
  ): Promise<void> {
    try {
      console.log(`Setup intent succeeded: ${setupIntent.id}`)
    } catch (error) {
      console.error('Error handling setup intent succeeded:', error)
      throw error
    }
  }

  private async handlePaymentMethodUpdated(
    paymentMethod: any,
  ): Promise<void> {
    try {
      console.log(`Payment method automatically updated: ${paymentMethod.id}`)
    } catch (error) {
      console.error('Error handling payment method updated:', error)
      throw error
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

  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
  ): any {
    try {
      return stripeService.constructWebhookEvent(payload, signature)
    } catch (error) {
      console.error('Webhook signature verification failed:', error)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid webhook signature')
    }
  }
}

export const webhookService = new WebhookService()
