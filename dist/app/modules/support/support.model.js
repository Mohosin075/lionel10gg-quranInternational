'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Support = void 0
const mongoose_1 = require('mongoose')
const support_1 = require('../../../enum/support')
const supportSchema = new mongoose_1.Schema(
  {
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
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
      enum: Object.values(support_1.SUPPORT_STATUS),
      default: support_1.SUPPORT_STATUS.IN_PROGRESS,
    },
    attachments: { type: [String] },
  },
  {
    timestamps: true,
  },
)
exports.Support = (0, mongoose_1.model)('Support', supportSchema)
