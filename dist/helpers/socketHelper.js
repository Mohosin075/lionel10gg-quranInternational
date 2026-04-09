'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.socketHelper = void 0
const colors_1 = __importDefault(require('colors'))
const socket = io => {
  io.on('connection', socket => {
    console.log(colors_1.default.blue('A user connected'), socket.id)
    // Join chat room
    socket.on('join-room', roomId => {
      if (roomId) {
        socket.join(`room:${roomId}`)
        console.log(
          colors_1.default.green(`User ${socket.id} joined room:${roomId}`),
        )
      }
    })
    // Leave chat room
    socket.on('leave-room', roomId => {
      if (roomId) {
        socket.leave(`room:${roomId}`)
        console.log(
          colors_1.default.yellow(`User ${socket.id} left room:${roomId}`),
        )
      }
    })
    //disconnect
    socket.on('disconnect', () => {
      console.log(colors_1.default.red('A user disconnect'), socket.id)
    })
  })
}
exports.socketHelper = { socket }
