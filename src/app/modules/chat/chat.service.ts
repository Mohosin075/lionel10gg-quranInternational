import { Types } from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { USER_STATUS } from '../../../enum/user'
import { User } from '../user/user.model'
import { Message } from '../message/message.model'
import { IChat } from './chat.interface'
import { Chat } from './chat.model'

const assertChatParticipant = async (chatId: string, userId: string) => {
  if (!Types.ObjectId.isValid(chatId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid chat id')
  }

  const chat = await Chat.findOne({
    _id: chatId,
    participants: userId,
    status: true,
  })

  if (!chat) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'You are not a participant of this chat',
    )
  }

  return chat
}

const createChatToDB = async (
  userId: string,
  otherUserId: string,
): Promise<IChat> => {
  if (!userId || !Types.ObjectId.isValid(otherUserId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid user id')
  }

  if (String(userId) === String(otherUserId)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You cannot start a chat with yourself',
    )
  }

  const otherUser = await User.findOne({
    _id: otherUserId,
    status: USER_STATUS.ACTIVE,
  }).select('_id')

  if (!otherUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  const participants = [userId, otherUserId]
  const isExistChat: IChat | null = await Chat.findOne({
    participants: { $all: participants },
  })

  if (isExistChat) {
    return isExistChat
  }

  return Chat.create({ participants })
}

const getChatFromDB = async (
  user: Record<string, unknown>,
  search: string,
): Promise<unknown> => {
  const chats = await Chat.find({ participants: { $in: [user.authId] } })
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
  const filteredChats = chats?.filter(
    chat => (chat?.participants as unknown[])?.length > 0,
  )

  // Get last message and unread count for each chat
  const chatsWithDetails = await Promise.all(
    filteredChats.map(async chat => {
      const lastMessage = await Message.findOne(
        { chatId: chat._id },
        { text: 1, image: 1, createdAt: 1, seen: 1, sender: 1 },
      )
        .sort({ createdAt: -1 })
        .limit(1)
        .populate('sender', 'name image') // Populate sender info if needed
        .lean()

      const unreadCount = await Message.countDocuments({
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

export const ChatService = {
  assertChatParticipant,
  createChatToDB,
  getChatFromDB,
}
