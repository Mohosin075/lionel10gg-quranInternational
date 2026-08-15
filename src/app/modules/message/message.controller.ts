import { Request, Response } from 'express'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { StatusCodes } from 'http-status-codes'
import { MessageService } from './message.service'
import { ChatService } from '../chat/chat.service'
import ApiError from '../../../errors/ApiError'
import { Types } from 'mongoose'
import { IUserPayload } from '../../../interfaces/jwtPayload'

const sendMessage = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as IUserPayload
  const payload = req.body

  const chat = await ChatService.assertChatParticipant(
    payload.chatId,
    user.authId,
  )

  const receiver = chat.participants.find(
    p => p.toString() !== String(user.authId),
  )

  if (!receiver) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'No receiver found')
  }

  const receiverId =
    receiver instanceof Types.ObjectId
      ? receiver.toString()
      : String(receiver)

  const data = {
    ...req.body,
    image: payload?.images ? payload.images[0] : null,
    sender: user.authId,
    receiver: receiverId,
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
