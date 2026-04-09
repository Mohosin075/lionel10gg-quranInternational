import { Types } from 'mongoose'
import { Message } from '../message/message.model'
import { IChat } from './chat.interface'
import { Chat } from './chat.model'

const createChatToDB = async (payload: Types.ObjectId[]): Promise<IChat> => {
  const isExistChat: IChat | null = await Chat.findOne({
    participants: { $all: payload },
  })

  if (isExistChat) {
    return isExistChat
  }
  const chat: IChat = await Chat.create({ participants: payload })
  return chat
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

export const ChatService = { createChatToDB, getChatFromDB }
