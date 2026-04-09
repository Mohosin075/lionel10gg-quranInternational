import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { MessageService } from './message.service'
import { Chat } from '../chat/chat.model'
import ApiError from '../../../errors/ApiError'
import { Types } from 'mongoose'
import { IUserPayload } from '../../../interfaces/jwtPayload'

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUserPayload

  const payload = req.body

  const chat = await Chat.findById(payload.chatId).populate('participants')
  if (!chat) throw new ApiError(StatusCodes.NOT_FOUND, 'Chat not found')

  // find the receiver (the participant that is NOT the sender)
  const receiver = (
    chat.participants as unknown as (Types.ObjectId | { _id: Types.ObjectId })[]
  ).find(p => {
    const pId = p instanceof Types.ObjectId ? p.toString() : p._id.toString()
    return pId !== user.authId
  })

  if (!receiver)
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No receiver found')

  const receiverId =
    receiver instanceof Types.ObjectId
      ? receiver.toString()
      : receiver._id.toString()
  payload.receiver = receiverId // now you have a valid receiver ID

  const data = {
    ...req.body,
    image: payload?.images ? payload.images[0] : null,
    sender: user.authId,
  }

  const message = await MessageService.sendMessageToDB(data)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Send Message Successfully',
    data: message,
  })
})

const getMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUserPayload
  const id = req.params.id
  const messages = await MessageService.getMessageFromDB(id, user)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Message Retrieve Successfully',
    data: messages,
  })
})

export const MessageController = { sendMessage, getMessage }
