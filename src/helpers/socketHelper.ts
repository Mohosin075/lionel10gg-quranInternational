import colors from 'colors'
import { Server } from 'socket.io'

const socket = (io: Server) => {
  io.on('connection', socket => {
    console.log(colors.blue('A user connected'), socket.id)

    // Join chat room
    socket.on('join-room', (roomId: string) => {
      if (roomId) {
        socket.join(`room:${roomId}`)
        console.log(colors.green(`User ${socket.id} joined room:${roomId}`))
      }
    })

    // Leave chat room
    socket.on('leave-room', (roomId: string) => {
      if (roomId) {
        socket.leave(`room:${roomId}`)
        console.log(colors.yellow(`User ${socket.id} left room:${roomId}`))
      }
    })

    //disconnect
    socket.on('disconnect', () => {
      console.log(colors.red('A user disconnect'), socket.id)
    })
  })
}

export const socketHelper = { socket }
