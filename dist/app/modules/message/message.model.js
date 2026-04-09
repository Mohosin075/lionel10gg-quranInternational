'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.Message = void 0
const mongoose_1 = require('mongoose')
const messageSchema = new mongoose_1.Schema(
  {
    chatId: {
      type: mongoose_1.Schema.Types.ObjectId,
      required: true,
      ref: 'Chat',
    },
    sender: {
      type: mongoose_1.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    text: {
      type: String,
      required: false,
    },
    image: {
      type: String,
      required: false,
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)
exports.Message = (0, mongoose_1.model)('Message', messageSchema)
