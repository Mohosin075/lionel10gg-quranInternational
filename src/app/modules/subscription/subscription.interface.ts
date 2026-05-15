/* eslint-disable @typescript-eslint/no-explicit-any */
import { Model, Types } from 'mongoose'

// Subscription Plan Interface
export interface ISubscriptionPlan {
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

export type SubscriptionPlanModel = Model<ISubscriptionPlan>

// Subscription Interface
export interface ISubscription {
  _id?: Types.ObjectId
  userId: Types.ObjectId
  planId: Types.ObjectId
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  status:
    | 'incomplete'
    | 'incomplete_expired'
    | 'active'
    | 'past_due'
    | 'canceled'
    | 'unpaid'
    | 'paused'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  canceledAt?: Date | null
  pausedAt?: Date | null
  resumedAt?: Date | null
  lastSyncedAt?: Date | null
  cancelAtPeriodEnd: boolean
  endedAt?: Date | null
  metadata: Map<string, string>
  lastPaymentDate?: Date | null
  nextPaymentDate?: Date | null
  paymentFailureCount: number
  fraudFlags?: string
  lastWebhookEventId?: string | null
  riskScore?: number
  createdAt?: Date
  updatedAt?: Date
}

export interface SubscriptionModel extends Model<ISubscription> {
  findActiveByUserId(userId: string): Promise<ISubscription | null>
  findByStripeId(stripeSubscriptionId: string): Promise<ISubscription | null>
}

// Request/Response Types
export interface CreateSubscriptionRequest {
  planId: string
  paymentMethodId?: string
  couponId?: string
}

export interface UpdateSubscriptionRequest {
  planId?: string
  cancelAtPeriodEnd?: boolean
}

export interface SubscriptionResponse {
  subscription: ISubscription
  clientSecret?: string
}

export interface PlanResponse {
  plans: ISubscriptionPlan[]
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

// Subscription Status Check
export interface SubscriptionStatus {
  isActive: boolean
  isTrialing: boolean
  isPastDue: boolean
  isCanceled: boolean
  daysUntilExpiry: number
  currentPlan?: ISubscriptionPlan
}
