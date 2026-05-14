/* eslint-disable @typescript-eslint/no-explicit-any */
import { USER_ROLES } from '../../../enum/user'
import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { IPaymentFilterables, IPayment } from './payment.interface'
import { Payment } from './payment.model'
import { JwtPayload } from 'jsonwebtoken'
import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'
import { paymentSearchableFields } from './payment.constants'
import { Types } from 'mongoose'
import { User } from '../user/user.model'
import config from '../../../config'
import { WebhookService } from './webhook.service'
import { emailHelper } from '../../../helpers/emailHelper'
import Stripe from 'stripe'

const stripe = new Stripe(config.stripe.stripeSecretKey!, {
  apiVersion: '2026-04-22.dahlia' as any,
})

const createCheckoutSession = async (
  user: any,
  payload: any,
): Promise<{ sessionId: string; url: string }> => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: (payload.currency || 'EUR').toLowerCase(),
            product_data: {
              name: payload.productName || 'Payment',
              description: payload.description,
            },
            unit_amount: Math.round(payload.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${config.clientUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${config.clientUrl}/payment/cancel?success=false`,
      customer_email: user.email,
      metadata: {
        userId: user.authId.toString(),
        mapId: payload.mapId.toString(),
        ...payload.metadata
      },
    })

    await Payment.create({
      userId: user.authId,
      mapId: payload.mapId,
      userEmail: user.email,
      amount: payload.amount,
      currency: payload.currency || 'EUR',
      paymentMethod: 'stripe',
      paymentIntentId: session.payment_intent || session.id,
      status: 'pending',
      metadata: {
        checkoutSessionId: session.id,
        mapId: payload.mapId.toString(),
        ...payload.metadata
      },
    })

    return {
      sessionId: session.id,
      url: session.url!,
    }
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Checkout session creation failed: ${error.message}`,
    )
  }
}

const verifyCheckoutSession = async (sessionId: string): Promise<IPayment> => {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })

    console.log('🔍 Verifying Checkout Session:', session.id)
    console.log('🔍 Payment Intent:', session.payment_intent)
    console.log('🔍 Metadata:', session.metadata)

    const payment = await Payment.findOne({
      $or: [
        { paymentIntentId: sessionId },
        { 'metadata.checkoutSessionId': sessionId },
        { paymentIntentId: session.payment_intent as string }
      ]
    })
      .populate('userId', 'name email')

    if (!payment) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found')
    }

    if (session.payment_status === 'paid' && payment.status !== 'succeeded') {
      const session = await Payment.startSession()
      session.startTransaction()

      try {
        payment.status = 'succeeded'
        payment.metadata = { ...payment.metadata, session }
        await payment.save({ session })

        const user = await payment.populate('userId')
        const userData = user.userId as any

        if (userData) {
          await emailHelper.sendEmail({
            to: userData.email,
            subject: 'Payment Successful',
            html: `<p>Hi ${userData.name}, your payment of ${payment.amount} ${payment.currency} was successful.</p>`
          })
        }

        await session.commitTransaction()
      } catch (error) {
        await session.abortTransaction()
        throw error
      } finally {
        session.endSession()
      }
    } else if (
      session.payment_status === 'unpaid' &&
      payment.status !== 'failed'
    ) {
      payment.status = 'failed'
      await payment.save()
    }

    return payment
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Payment verification failed: ${error.message}`,
    )
  }
}

const createPaymentIntent = async (
  user: any,
  payload: any,
): Promise<{ clientSecret: string; paymentIntentId: string; amount: number }> => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(payload.amount * 100),
      currency: payload.currency || 'eur',
      metadata: {
        userId: user.authId.toString(),
        userEmail: user.email,
        mapId: payload.mapId.toString(),
        ...payload.metadata
      },
    })

    await Payment.create({
      userId: user.authId,
      mapId: payload.mapId,
      userEmail: user.email,
      amount: payload.amount,
      currency: (payload.currency || 'EUR').toUpperCase(),
      paymentMethod: 'stripe',
      paymentIntentId: paymentIntent.id,
      status: 'pending',
      metadata: {
        userId: user.authId.toString(),
        mapId: payload.mapId.toString(),
        ...payload.metadata
      },
    })

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: payload.amount,
    }
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Payment Intent creation failed: ${error.message}`,
    )
  }
}

const createEphemeralKey = async (
  user: any,
  apiVersion: string = '2025-05-28.basil',
): Promise<{ ephemeralKey: string }> => {
  try {
    let customerId = user.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.authId.toString(),
        },
      })
      customerId = customer.id

      await User.findByIdAndUpdate(user.authId, { stripeCustomerId: customer.id })
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: apiVersion as any },
    )

    return {
      ephemeralKey: ephemeralKey.secret!,
    }
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Ephemeral key creation failed: ${error.message}`,
    )
  }
}

const handlePaymentIntentWebhook = async (
  paymentIntent: any,
): Promise<void> => {
  try {
    const payment = await Payment.findOne({
      paymentIntentId: paymentIntent.id,
    })

    if (!payment) {
      console.error(`Payment not found for Payment Intent: ${paymentIntent.id}`)
      return
    }

    if (payment.status === 'succeeded') {
      console.log(`Payment already processed: ${paymentIntent.id}`)
      return
    }

    const session = await Payment.startSession()
    session.startTransaction()

    try {
      payment.status = 'succeeded'
      payment.metadata = {
        ...payment.metadata,
        processedAt: new Date().toISOString(),
      }
      await payment.save({ session })

      await session.commitTransaction()
      console.log(`Payment processed successfully: ${paymentIntent.id}`)
    } catch (error) {
      await session.abortTransaction()
      throw error
    } finally {
      session.endSession()
    }
  } catch (error: any) {
    console.error(`Webhook processing failed: ${error.message}`)
    throw error
  }
}

const getAllPayments = async (
  user: JwtPayload,
  filterables: IPaymentFilterables,
  pagination: IPaginationOptions,
) => {
  const { searchTerm, ...filterData } = filterables
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper.calculatePagination(pagination)

  const andConditions = []

  if (searchTerm) {
    andConditions.push({
      $or: paymentSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    })
  }

  if (Object.keys(filterData).length) {
    andConditions.push({
      $and: Object.entries(filterData).map(([key, value]) => ({
        [key]: value,
      })),
    })
  }

  if (user.activeRole === USER_ROLES.USER) {
    andConditions.push({
      userId: new Types.ObjectId(user.authId),
    })
  }

  const whereConditions = andConditions.length ? { $and: andConditions } : {}

  const [result, total] = await Promise.all([
    Payment.find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .populate('userId', 'name email')
      .populate({
        path: 'mapId'
      }),
    Payment.countDocuments(whereConditions),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

const getSinglePayment = async (id: string): Promise<IPayment> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Payment ID')
  }

  const result = await Payment.findById(id)
    .populate('userId', 'name email')

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested payment not found, please try again with valid id',
    )
  }

  return result
}

const updatePayment = async (
  id: string,
  payload: Partial<IPayment>,
): Promise<IPayment | null> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Payment ID')
  }

  const result = await Payment.findByIdAndUpdate(
    new Types.ObjectId(id),
    { $set: payload },
    {
      new: true,
      runValidators: true,
    },
  )
    .populate('userId', 'name email')

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'Requested payment not found, please try again with valid id',
    )
  }

  return result
}

const refundPayment = async (
  id: string,
  reason?: string,
): Promise<IPayment> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Payment ID')
  }

  const payment = await Payment.findById(id)
  if (!payment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found')
  }

  if (payment.status !== 'succeeded') {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Only successful payments can be refunded',
    )
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
      amount: Math.round(payment.amount * 100),
      reason: reason ? 'requested_by_customer' : 'duplicate',
    })

    const result = await Payment.findByIdAndUpdate(
      id,
      {
        status: 'refunded',
        refundAmount: payment.amount,
        refundReason: reason,
        metadata: { ...payment.metadata, refundId: refund.id },
      },
      { new: true, runValidators: true },
    )
      .populate('userId', 'name email')

    return result!
  } catch (error: any) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Refund failed: ${error.message}`,
    )
  }
}

const getMyPayments = async (
  user: JwtPayload,
  pagination: IPaginationOptions,
) => {
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper.calculatePagination(pagination)

  const [result, total] = await Promise.all([
    Payment.find({ userId: new Types.ObjectId(user.authId) })
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .populate('userId', 'name email'),
    Payment.countDocuments({ userId: new Types.ObjectId(user.authId) }),
  ])

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}

const generateInvoice = async (id: string): Promise<string | Buffer> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Payment ID')
  }

  const payment = await Payment.findById(id).populate('userId').populate('mapId')

  if (!payment) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Payment not found')
  }

  if (payment.paymentIntentId && payment.status === 'succeeded' && payment.paymentMethod === 'stripe') {
    try {
      const pi = await stripe.paymentIntents.retrieve(payment.paymentIntentId)
      if (pi.latest_charge) {
        const charge = await stripe.charges.retrieve(pi.latest_charge as string)
        if (charge.receipt_url) {
          return charge.receipt_url
        }
      }
    } catch (error) {
      console.error('Failed to fetch stripe receipt:', error)
    }
  }

  throw new ApiError(StatusCodes.NOT_IMPLEMENTED, 'Custom PDF generation not available')
}

export const PaymentServices = {
  getAllPayments,
  getSinglePayment,
  updatePayment,
  refundPayment,
  getMyPayments,
  createCheckoutSession,
  verifyCheckoutSession,
  handleWebhook: WebhookService.handleWebhook,
  createPaymentIntent,
  createEphemeralKey,
  handlePaymentIntentWebhook,
  generateInvoice,
}
