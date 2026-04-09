'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.MessageService = void 0
const mongoose_1 = __importDefault(require('mongoose'))
const message_model_1 = require('./message.model')
const ApiError_1 = __importDefault(require('../../../errors/ApiError'))
const http_status_codes_1 = require('http-status-codes')
const chat_model_1 = require('../chat/chat.model')
const sendMessageToDB = async payload => {
  console.log(payload)
  if (!mongoose_1.default.Types.ObjectId.isValid(payload.receiver)) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Invalid Receiver ID',
    )
  }
  // save to DB
  const response = await message_model_1.Message.create(payload)
  // Update Chat's updatedAt to bring it to the top
  await chat_model_1.Chat.findByIdAndUpdate(payload.chatId, {
    $set: { updatedAt: new Date() },
  })
  // @ts-expect-error global io
  const io = global.io
  if (io) {
    io.emit(
      `getMessage::${payload === null || payload === void 0 ? void 0 : payload.chatId}`,
      response,
    )
    io.emit(
      `updateChatList::${payload === null || payload === void 0 ? void 0 : payload.sender}`,
    )
    io.emit(
      `updateChatList::${payload === null || payload === void 0 ? void 0 : payload.receiver}`,
    )
    // const sender = await User.findById(payload.sender).select("name")
    // const data = {
    //   text: `${sender?.name} send you message.`,
    //   title: "Received Message",
    //   link: payload?.chatId,
    //   direction: "message",
    //   receiver: payload.receiver
    // }
    // await sendNotifications(data);
  }
  return response
}
const getMessageFromDB = async (chatId, user) => {
  // Find messages that will be marked as seen to identify the sender
  const unreadMessages = await message_model_1.Message.find({
    chatId,
    sender: { $ne: user.authId },
    seen: false,
  })
  if (unreadMessages.length > 0) {
    // Mark messages as seen when chat is opened
    await message_model_1.Message.updateMany(
      { chatId, sender: { $ne: user.authId }, seen: false },
      { $set: { seen: true } },
    )
    // Notify the senders that their messages were seen
    // @ts-expect-error global io
    const io = global.io
    if (io) {
      // For each unique sender of the unread messages, notify them
      const senders = [...new Set(unreadMessages.map(m => m.sender.toString()))]
      senders.forEach(senderId => {
        io.emit(`updateChatList::${senderId}`)
      })
    }
  }
  const messages = await message_model_1.Message.find({ chatId })
    .sort({ createdAt: -1 })
    .lean()
  return messages
}
exports.MessageService = { sendMessageToDB, getMessageFromDB }
