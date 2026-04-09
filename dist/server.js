'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.io = exports.onlineUsers = void 0
const colors_1 = __importDefault(require('colors'))
const mongoose_1 = __importDefault(require('mongoose'))
const app_1 = __importDefault(require('./app'))
const config_1 = __importDefault(require('./config'))
const socket_io_1 = require('socket.io')
const user_service_1 = require('./app/modules/user/user.service')
const socketHelper_1 = require('./helpers/socketHelper')
// Uncaught exceptions
process.on('uncaughtException', error => {
  console.error('🔥 UncaughtException Detected:', error)
  process.exit(1)
})
exports.onlineUsers = new Map()
let server
async function main() {
  try {
    await mongoose_1.default.connect(config_1.default.database_url)
    console.log(colors_1.default.green('🚀 Database connected successfully'))
    // Check and Create Super Admin
    await user_service_1.UserServices.createAdmin()
    const port =
      typeof config_1.default.port === 'number'
        ? config_1.default.port
        : Number(config_1.default.port)
    server = app_1.default.listen(port, '0.0.0.0', () => {
      console.log(
        colors_1.default.blue(`💨 Server is running on port: ${port}`),
      )
    })
    // Initialize Socket.io
    exports.io = new socket_io_1.Server(server, {
      cors: {
        origin: config_1.default.cors_origins,
        credentials: true,
      },
    })
    // Socket helper
    socketHelper_1.socketHelper.socket(exports.io)
    // @ts-expect-error global io
    global.io = exports.io
  } catch (error) {
    console.error(
      colors_1.default.red('🤢 Failed to start the server or connect to DB'),
      error,
    )
  }
  // Handle unhandled promise rejections
  process.on('unhandledRejection', error => {
    if (server) {
      server.close(() => {
        console.error('🔥 UnhandledRejection Detected:', error)
        process.exit(1)
      })
    } else {
      console.error('🔥 UnhandledRejection Detected:', error)
      process.exit(1)
    }
  })
}
// Start main
main()
// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM received, shutting down server...')
  if (server) {
    server.close()
  }
})
