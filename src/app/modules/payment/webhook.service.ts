/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes'
import config from '../../../config'
import ApiError from '../../../errors/ApiError'
import { Payment } from './payment.model'
import { emailHelper } from '../../../helpers/emailHelper'
import Stripe from 'stripe'

const stripe = new Stripe(config.stripe.stripeSecretKey!, {
  apiVersion: '2026-04-22.dahlia' as any,
})


const handleCheckoutSessionCompleted = async (
  sessionData: any,
): Promise<void> => {
  try {
    console.log('🔔 Processing Checkout Session Completed:', sessionData.id)
    const sessionWithDetails = await stripe.checkout.sessions.retrieve(
      sessionData.id,
      {
        expand: ['payment_intent', 'line_items'],
      },
    )
    console.log('✅ Session Details Retrieved. Payment Intent:', sessionWithDetails.payment_intent)
    let lookupId: string

    if (typeof sessionWithDetails.payment_intent === 'string') {
      lookupId = sessionWithDetails.payment_intent
    } else if (sessionWithDetails.payment_intent?.id) {
      lookupId = sessionWithDetails.payment_intent.id
    } else {
      lookupId = sessionWithDetails.id
    }

    const mongoSession = await Payment.startSession()
    mongoSession.startTransaction()

    try {
      const payment = await Payment.findOne({
        $or: [
          { paymentIntentId: lookupId },
          { paymentIntentId: sessionWithDetails.id },
          { 'metadata.checkoutSessionId': sessionWithDetails.id },
        ],
      }).session(mongoSession)

      if (!payment) {
        throw new Error(
          `Payment not found for session: ${sessionWithDetails.id}`,
        )
      }

      if (payment.status === 'succeeded') {
        await mongoSession.commitTransaction()
        return
      }

      payment.status = 'succeeded'
      payment.metadata = { ...payment.metadata, ...sessionWithDetails }
      await payment.save({ session: mongoSession })

      await mongoSession.commitTransaction()
      console.log(
        `Successfully processed payment for session: ${sessionWithDetails.id}`,
      )

      await emailHelper.sendEmail({
        to: payment.userEmail,
        subject: 'Payment Successful',
        html: `<p>Your payment was successful.</p>`
      })
    } catch (error) {
      await mongoSession.abortTransaction()
      throw error
    } finally {
      mongoSession.endSession()
    }
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Checkout processing failed: ${error.message}`,
    )
  }
}

const handleCheckoutSessionExpired = async (session: any): Promise<void> => {
  const mongoSession = await Payment.startSession()
  mongoSession.startTransaction()

  try {
    const payment = await Payment.findOne({
      $or: [
        { paymentIntentId: session.id },
        { 'metadata.checkoutSessionId': session.id },
      ],
    }).session(mongoSession)

    if (payment) {
      payment.status = 'failed'
      payment.metadata = { ...payment.metadata, ...session, expired: true }
      await payment.save({ session: mongoSession })


    }

    await mongoSession.commitTransaction()
  } catch (error) {
    await mongoSession.abortTransaction()
    throw error
  } finally {
    mongoSession.endSession()
  }
}

const handlePaymentSuccess = async (paymentIntent: any): Promise<void> => {
  const mongoSession = await Payment.startSession()
  mongoSession.startTransaction()



  try {
    let payment = await Payment.findOne({
      paymentIntentId: paymentIntent.id,
    }).session(mongoSession)

    if (!payment) {
      const metadata = paymentIntent.metadata || {}
      const userId = metadata.userId
      
      if (userId) {
        payment = await Payment.findOne({
          userId,
          status: 'pending',
        })
        .sort({ createdAt: -1 }) 
        .session(mongoSession)
   
        if (payment) {
          payment.paymentIntentId = paymentIntent.id
        }
      }
    }

    if (!payment) {
      await mongoSession.commitTransaction()
      return
    }

    if (payment.status === 'succeeded') {
      await mongoSession.commitTransaction()
      return
    }

    payment.status = 'succeeded'
    payment.metadata = { ...payment.metadata, ...paymentIntent }
    await payment.save({ session: mongoSession })

    await mongoSession.commitTransaction()
    console.log(`Successfully processed payment intent: ${paymentIntent.id}`)

    if (payment.userEmail) {
      await emailHelper.sendEmail({
        to: payment.userEmail,
        subject: 'Payment Successful',
        html: `<p>Your payment was successful.</p>`
      })
    }
  } catch (error) {
    await mongoSession.abortTransaction()
    throw error
  } finally {
    mongoSession.endSession()
  }
}

const handlePaymentFailure = async (paymentIntent: any): Promise<void> => {
  const mongoSession = await Payment.startSession()
  mongoSession.startTransaction()

  try {
    const payment = await Payment.findOne({
      paymentIntentId: paymentIntent.id,
    }).session(mongoSession)

    if (payment) {
      payment.status = 'failed'
      payment.metadata = { ...payment.metadata, ...paymentIntent }
      await payment.save({ session: mongoSession })
    }

    await mongoSession.commitTransaction()
  } catch (error) {
    await mongoSession.abortTransaction()
    throw error
  } finally {
    mongoSession.endSession()
  }
}

export const WebhookService = {
  handleWebhook: async (payload: { body: any; headers: any }): Promise<void> => {
    console.log('🔔 Processing Checkout Session Completed:', payload)
    try {
      const signature = payload.headers['stripe-signature']
      const webhookSecret = config.stripe.paymentWebhookSecret

      let event

      if (signature && webhookSecret) {
        try {
          event = stripe.webhooks.constructEvent(
            payload.body,
            signature,
            webhookSecret,
          )
        } catch (err: any) {
          console.error('⚠️ Webhook signature verification failed:', err.message)
          event = JSON.parse(payload.body.toString())
        }
      } else {
        event = JSON.parse(payload.body.toString())
      }

      console.log(`Processing webhook: ${event.type}`)

      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object)
          break
        case 'checkout.session.expired':
          await handleCheckoutSessionExpired(event.data.object)
          break
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object)
          break
        case 'payment_intent.payment_failed':
          await handlePaymentFailure(event.data.object)
          break
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }
    } catch (error: any) {
      console.error('Webhook processing error:', error)
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `Webhook processing failed: ${error.message}`,
      )
    }
  },
}
