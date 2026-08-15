import colors from 'colors'
import { Types } from 'mongoose'
import { Server } from 'socket.io'
import { socketMiddleware } from '../app/middleware/socketAuth'
import { Chat } from '../app/modules/chat/chat.model'
import { SocketWithUser } from '../interfaces/socket'

const socket = (io: Server) => {
  io.use(socketMiddleware.socketAuth())

  io.on('connection', (socket: SocketWithUser) => {
    console.log(colors.blue('A user connected'), socket.id)

    if (socket.user?.authId) {
      socket.join(`user:${socket.user.authId}`)
    }

    socket.on('join-room', async (roomId: string) => {
      if (!socket.user?.authId) {
        socket.emit('socket_error', {
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Authentication required to join a room',
        })
        return
      }

      if (!roomId || !Types.ObjectId.isValid(roomId)) {
        socket.emit('socket_error', {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid room id',
        })
        return
      }

      const chat = await Chat.findOne({
        _id: roomId,
        participants: socket.user.authId,
        status: true,
      }).select('_id')

      if (!chat) {
        socket.emit('socket_error', {
          statusCode: 403,
          error: 'Forbidden',
          message: 'You are not a participant of this room',
        })
        return
      }

      socket.join(`room:${roomId}`)
      console.log(colors.green(`User ${socket.id} joined room:${roomId}`))
    })

    socket.on('leave-room', (roomId: string) => {
      if (roomId) {
        socket.leave(`room:${roomId}`)
        console.log(colors.yellow(`User ${socket.id} left room:${roomId}`))
      }
    })

    socket.on('disconnect', () => {
      console.log(colors.red('A user disconnect'), socket.id)
    })
  })
}

export const socketHelper = { socket }
