import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { PaymentServices } from './payment.service'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import pick from '../../../shared/pick'
import { IPaymentFilterables } from './payment.interface'
import { paymentFilterableFields } from './payment.constants'
import { JwtPayload } from 'jsonwebtoken'
import { paginationFields } from '../../../interfaces/pagination'


const verifyCheckoutSession = catchAsync(
  async (req: Request, res: Response) => {
    const { sessionId } = req.params
    const result = await PaymentServices.verifyCheckoutSession(
      sessionId,
      req.user as JwtPayload,
    )

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Payment verified successfully',
      data: result,
    })
  },
)

const verifyPaymentIntent = catchAsync(
  async (req: Request, res: Response) => {
    const { paymentIntentId } = req.body
    const result = await PaymentServices.verifyPaymentIntent(
      paymentIntentId,
      req.user as JwtPayload,
    )

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Payment and subscription verified successfully',
      data: result,
    })
  },
)

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
  await PaymentServices.handleWebhook({
    body: req.body,
    headers: req.headers,
  })

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Webhook processed successfully',
    data: null,
  })
})

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user
  const filters = pick(
    req.query,
    paymentFilterableFields,
  ) as IPaymentFilterables
  const paginationOptions = pick(req.query, paginationFields)

  const result = await PaymentServices.getAllPayments(
    user as JwtPayload,
    filters,
    paginationOptions,
  )

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payments retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await PaymentServices.getSinglePayment(
    id,
    req.user as JwtPayload,
  )

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payment retrieved successfully',
    data: result,
  })
})

const updatePayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await PaymentServices.updatePayment(id, req.body)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payment updated successfully',
    data: result,
  })
})

const refundPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const { reason } = req.body
  const result = await PaymentServices.refundPayment(id, reason)

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Payment refunded successfully',
    data: result,
  })
})

const createEphemeralKey = catchAsync(
  async (req: Request, res: Response) => {
    const user = req.user as JwtPayload
    const { apiVersion } = req.body
    const result = await PaymentServices.createEphemeralKey(user, apiVersion)

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Ephemeral key created successfully',
      data: result,
    })
  },
)

// ============================================
// EXISTING CONTROLLERS
// ============================================

const getDonationPresets = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentServices.getDonationPresets()

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Donation presets retrieved successfully',
    data: result,
  })
})

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload
  const paginationOptions = pick(req.query, paginationFields)

  const result = await PaymentServices.getMyPayments(user, paginationOptions)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'My payments retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})

const generateInvoice = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params
  const result = await PaymentServices.generateInvoice(
    id,
    req.user as JwtPayload,
  )

  if (typeof result === 'string' && result.startsWith('http')) {
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Invoice URL retrieved successfully',
      data: { url: result },
    })
    return
  }

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Invoice generated successfully',
    data: result,
  })
})

export const PaymentController = {
  handleWebhook,
  getAllPayments,
  getSinglePayment,
  updatePayment,
  refundPayment,
  getMyPayments,
  verifyCheckoutSession,
  verifyPaymentIntent,
  createEphemeralKey,
  generateInvoice,
  getDonationPresets,
}
