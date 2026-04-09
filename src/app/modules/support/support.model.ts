import { Schema, model } from 'mongoose'
import { ISupport, SupportModel } from './support.interface'
import { SUPPORT_STATUS } from '../../../enum/support'

const supportSchema = new Schema<ISupport, SupportModel>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    contentType: {
      type: String,
      enum: ['comment', 'review'],
    },
    reason: {
      type: String,
      enum: ['harassment', 'spam', 'fraud', 'other'],
      default: 'other',
    },
    subject: { type: String },
    message: { type: String },
    status: {
      type: String,
      enum: Object.values(SUPPORT_STATUS),
      default: SUPPORT_STATUS.IN_PROGRESS,
    },
    attachments: { type: [String] },
  },
  {
    timestamps: true,
  },
)

export const Support = model<ISupport, SupportModel>('Support', supportSchema)
