import { Model, Types } from 'mongoose'

export interface IPaymentFilterables {
  searchTerm?: string
  userId?: string
  paymentMethod?: string
  status?: string
}

export interface IPayment {
  _id: Types.ObjectId
  userId: Types.ObjectId
  userEmail: string
  amount: number
  currency: string
  paymentMethod: 'stripe' | 'paypal' | 'bank_transfer'
  paymentType: 'one_time' | 'subscription'
  paymentIntentId: string
  status: 'pending' | 'succeeded' | 'failed' | 'refunded'
  refundAmount?: number
  refundReason?: string
  metadata?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export type PaymentModel = Model<IPayment>
