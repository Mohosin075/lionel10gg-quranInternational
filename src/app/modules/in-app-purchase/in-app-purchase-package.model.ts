import { Schema, model } from 'mongoose'
import {
  IInAppPurchasePlan,
  InAppPurchasePlanModel,
} from './in-app-purchase.interface'

const inAppPurchasePackageSchema = new Schema<
  IInAppPurchasePlan,
  InAppPurchasePlanModel
>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: 'usd',
    },
    interval: {
      type: String,
      enum: ['month', 'year'],
      required: true,
    },
    intervalCount: {
      type: Number,
      default: 1,
      min: 1,
    },
    features: [
      {
        type: String,
        required: true,
      },
    ],
    maxPhotos: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    stripePriceId: {
      type: String,
      required: true,
      // unique: true,
    },
    stripeProductId: {
      type: String,
      required: true,
    },
    priority: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
inAppPurchasePackageSchema.index({ isActive: 1 })
inAppPurchasePackageSchema.index({ stripePriceId: 1 })

export const InAppPurchasePlan = model<IInAppPurchasePlan, InAppPurchasePlanModel>(
  'InAppPurchasePlan',
  inAppPurchasePackageSchema,
)
