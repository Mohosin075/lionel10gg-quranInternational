import { Schema, model } from 'mongoose'
import { IInAppPurchase, InAppPurchaseModel } from './in-app-purchase.interface'

const inAppPurchaseSchema = new Schema<IInAppPurchase, InAppPurchaseModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: 'InAppPurchasePlan',
      required: true,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: true,
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    originalTransactionId: {
      type: String,
    },
    receiptData: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        'active',
        'expired',
        'canceled',
        'pending'
      ],
      default: 'active',
    },
    purchaseDate: {
      type: Date,
      required: true,
    },
    expiryDate: {
      type: Date,
    },
    canceledAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  },
)

// Indexes for efficient queries
inAppPurchaseSchema.index({ userId: 1 })
inAppPurchaseSchema.index({ transactionId: 1 })
inAppPurchaseSchema.index({ status: 1 })

// Compound indexes
inAppPurchaseSchema.index({ userId: 1, status: 1 })

// Static methods
inAppPurchaseSchema.statics.findActiveByUserId = function (userId: string) {
  return this.findOne({
    userId,
    status: { $in: ['active'] },
  }).populate('planId')
}

inAppPurchaseSchema.statics.findByTransactionId = function (
  transactionId: string,
) {
  return this.findOne({ transactionId }).populate(['userId', 'planId'])
}

export const InAppPurchase = model<IInAppPurchase, InAppPurchaseModel>(
  'InAppPurchase',
  inAppPurchaseSchema,
)
