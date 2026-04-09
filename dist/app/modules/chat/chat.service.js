'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.ChatService = void 0
const message_model_1 = require('../message/message.model')
const chat_model_1 = require('./chat.model')
const createChatToDB = async payload => {
  const isExistChat = await chat_model_1.Chat.findOne({
    participants: { $all: payload },
  })
  if (isExistChat) {
    return isExistChat
  }
  const chat = await chat_model_1.Chat.create({ participants: payload })
  return chat
}
const getChatFromDB = async (user, search) => {
  const chats = await chat_model_1.Chat.find({
    participants: { $in: [user.authId] },
  })
    .populate({
      path: 'participants',
      select: '_id name profile profession updatedAt',
      match: {
        _id: { $ne: user.authId },
        ...(search && { name: { $regex: search, $options: 'i' } }),
      },
    })
    .select('participants status updatedAt')
    .sort({ updatedAt: -1 }) // Sort chats by latest update
    .lean()
  // Filter out chats where no participants match
  const filteredChats =
    chats === null || chats === void 0
      ? void 0
      : chats.filter(chat => {
          var _a
          return (
            ((_a =
              chat === null || chat === void 0 ? void 0 : chat.participants) ===
              null || _a === void 0
              ? void 0
              : _a.length) > 0
          )
        })
  // Get last message and unread count for each chat
  const chatsWithDetails = await Promise.all(
    filteredChats.map(async chat => {
      const lastMessage = await message_model_1.Message.findOne(
        { chatId: chat._id },
        { text: 1, image: 1, createdAt: 1, seen: 1, sender: 1 },
      )
        .sort({ createdAt: -1 })
        .limit(1)
        .populate('sender', 'name image') // Populate sender info if needed
        .lean()
      const unreadCount = await message_model_1.Message.countDocuments({
        chatId: chat._id,
        sender: { $ne: user.authId },
        seen: false,
      })
      return {
        ...chat,
        lastMessage: lastMessage || null,
        unreadCount,
      }
    }),
  )
  const totalUnreadChats = chatsWithDetails.filter(
    chat => chat.unreadCount > 0,
  ).length
  return {
    chats: chatsWithDetails,
    totalUnreadChats,
  }
}
exports.ChatService = { createChatToDB, getChatFromDB }
