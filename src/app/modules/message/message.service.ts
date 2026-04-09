import mongoose from 'mongoose'
// import { sendNotifications } from '../../../helpers/notificationsHelper';
import { IMessage } from './message.interface'
import { Message } from './message.model'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'
import { Chat } from '../chat/chat.model'
import { IUserPayload } from '../../../interfaces/jwtPayload'

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

  // save to DB
  const response = await Message.create(payload)

  // Update Chat's updatedAt to bring it to the top
  await Chat.findByIdAndUpdate(payload.chatId as string, {
    $set: { updatedAt: new Date() },
  })

  // @ts-expect-error global io
  const io = global.io
  if (io) {
    io.emit(`getMessage::${payload?.chatId}`, response)
    io.emit(`updateChatList::${payload?.sender}`)
    io.emit(`updateChatList::${payload?.receiver}`)

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

const getMessageFromDB = async (
  chatId: string,
  user: IUserPayload,
): Promise<IMessage[]> => {
  // Find messages that will be marked as seen to identify the sender
  const unreadMessages = await Message.find({
    chatId,
    sender: { $ne: user.authId },
    seen: false,
  })

  if (unreadMessages.length > 0) {
    // Mark messages as seen when chat is opened
    await Message.updateMany(
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

  const messages = await Message.find({ chatId }).sort({ createdAt: -1 }).lean()
  return messages as unknown as IMessage[]
}

export const MessageService = { sendMessageToDB, getMessageFromDB }
