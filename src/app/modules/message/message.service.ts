import mongoose from 'mongoose'
import { IMessage } from './message.interface'
import { Message } from './message.model'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import { Chat } from '../chat/chat.model'
import { ChatService } from '../chat/chat.service'
import { IUserPayload } from '../../../interfaces/jwtPayload'

const emitToChat = (chatId: string, event: string, data?: unknown) => {
  // @ts-expect-error global io
  const io = global.io
  if (io) {
    io.to(`room:${chatId}`).emit(event, data)
  }
}

const emitToUser = (userId: string, event: string, data?: unknown) => {
  // @ts-expect-error global io
  const io = global.io
  if (io) {
    io.to(`user:${userId}`).emit(event, data)
  }
}

const sendMessageToDB = async (payload: {
  chatId: string
  sender: string
  receiver: string
  [key: string]: unknown
}): Promise<IMessage> => {
  if (
    !payload.receiver ||
    !mongoose.Types.ObjectId.isValid(payload.receiver as string)
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Receiver ID')
  }

  const response = await Message.create(payload)

  await Chat.findByIdAndUpdate(payload.chatId as string, {
    $set: { updatedAt: new Date() },
  })

  const chatId = String(payload.chatId)
  emitToChat(chatId, `getMessage::${chatId}`, response)
  emitToUser(String(payload.sender), `updateChatList::${payload.sender}`)
  emitToUser(String(payload.receiver), `updateChatList::${payload.receiver}`)

  return response
}

const getMessageFromDB = async (
  chatId: string,
  user: IUserPayload,
): Promise<IMessage[]> => {
  await ChatService.assertChatParticipant(chatId, user.authId)

  const unreadMessages = await Message.find({
    chatId,
    sender: { $ne: user.authId },
    seen: false,
  })

  if (unreadMessages.length > 0) {
    await Message.updateMany(
      { chatId, sender: { $ne: user.authId }, seen: false },
      { $set: { seen: true } },
    )

    const senders = [...new Set(unreadMessages.map(m => m.sender.toString()))]
    senders.forEach(senderId => {
      emitToUser(senderId, `updateChatList::${senderId}`)
    })
  }

  const messages = await Message.find({ chatId }).sort({ createdAt: -1 }).lean()
  return messages as unknown as IMessage[]
}

export const MessageService = { sendMessageToDB, getMessageFromDB }
