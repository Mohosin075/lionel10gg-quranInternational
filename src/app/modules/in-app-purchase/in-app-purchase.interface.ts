/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Types } from 'mongoose'

// InAppPurchase Plan Interface
export interface IInAppPurchasePlan {
  _id?: Types.ObjectId
  name: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year'
  intervalCount: number
  features: string[]
  maxPhotos: number
  isActive: boolean
  stripePriceId: string
  stripeProductId: string
  priority: number
  createdAt?: Date
  updatedAt?: Date
}

export type InAppPurchasePlanModel = Model<IInAppPurchasePlan>

// InAppPurchase Interface
export interface IInAppPurchase {
  _id?: Types.ObjectId
  userId: Types.ObjectId
  planId: Types.ObjectId
  platform: 'ios' | 'android' | 'web'
  transactionId: string
  originalTransactionId?: string
  receiptData?: string
  status:
    | 'active'
    | 'expired'
    | 'canceled'
    | 'pending'
  purchaseDate: Date
  expiryDate?: Date
  canceledAt?: Date | null
  metadata: Map<string, string>
  createdAt?: Date
  updatedAt?: Date
}

export interface InAppPurchaseModel extends Model<IInAppPurchase> {
  findActiveByUserId(userId: string): Promise<IInAppPurchase | null>
  findByTransactionId(transactionId: string): Promise<IInAppPurchase | null>
}

// Request/Response Types
export interface VerifyPurchaseRequest {
  planId: string
  platform: 'ios' | 'android'
  receiptData: string // iOS receipt or Android purchaseToken
  productId: string
}

export interface InAppPurchaseResponse {
  inAppPurchase: IInAppPurchase
  clientSecret?: string
}

export interface PlanResponse {
  plans: IInAppPurchasePlan[]
}

// Webhook Event Types
export interface StripeWebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
  created: number
}

// Trial Management
export interface TrialInfo {
  isEligible: boolean
  hasUsedTrial: boolean
  trialDays: number
  reason?: string
}

// InAppPurchase Status Check
export interface InAppPurchaseStatus {
  isActive: boolean
  isTrialing: boolean
  isPastDue: boolean
  isCanceled: boolean
  daysUntilExpiry: number
  currentPlan?: IInAppPurchasePlan
}
