import colors from 'colors'
import mongoose from 'mongoose'
import app from './app'
import config from './config'

import { Server as SocketServer } from 'socket.io'
import { UserServices } from './app/modules/user/user.service'
import { socketHelper } from './helpers/socketHelper'
import { Server as HttpServer } from 'http'

// Uncaught exceptions
process.on('uncaughtException', error => {
  console.error('🔥 UncaughtException Detected:', error)
  process.exit(1)
})

export const onlineUsers = new Map()
let server: HttpServer

export let io: SocketServer

async function main() {
  try {
    await mongoose.connect(config.database_url as string)
    console.log(colors.green('🚀 Database connected successfully'))

    // Check and Create Super Admin
    await UserServices.createAdmin()

    const port =
      typeof config.port === 'number' ? config.port : Number(config.port)

    server = app.listen(port, '0.0.0.0', () => {
      console.log(colors.blue(`💨 Server is running on port: ${port}`))
    })

    // Initialize Socket.io
    io = new SocketServer(server, {
      cors: {
        origin: config.cors_origins,
        credentials: true,
      },
    })

    // Socket helper
    socketHelper.socket(io)
    // @ts-expect-error global io
    global.io = io
  } catch (error) {
    console.error(
      colors.red('🤢 Failed to start the server or connect to DB'),
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
