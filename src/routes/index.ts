import { UserRoutes } from '../app/modules/user/user.route'
import { QuranRoutes } from '../app/modules/quran/quran.route'
import { AuthRoutes } from '../app/modules/auth/auth.route'
import express, { Router } from 'express'
import { PublicRoutes } from '../app/modules/public/public.route'
import { SupportRoutes } from '../app/modules/support/support.route'
import { UploadRoutes } from '../app/modules/upload/upload.route'
import { PrayerTimeRoutes } from '../app/modules/prayer-time/prayer-time.route'

import { NotificationRoutes } from '../app/modules/notification/notification.routes'
import { MessageRoutes } from '../app/modules/message/message.routes'
import { ChatRoutes } from '../app/modules/chat/chat.routes'
import { StatusCodes } from 'http-status-codes'

const router = express.Router()

const apiRoutes: { path: string; route: Router }[] = [
  { path: '/user', route: UserRoutes },
  { path: '/auth', route: AuthRoutes },
  { path: '/notifications', route: NotificationRoutes },
  { path: '/public', route: PublicRoutes },
  { path: '/support', route: SupportRoutes },
  { path: '/upload', route: UploadRoutes },

  { path: '/message', route: MessageRoutes },
  { path: '/chat', route: ChatRoutes },
  { path: '/quran', route: QuranRoutes },
  { path: '/prayer-time', route: PrayerTimeRoutes },
]

apiRoutes.forEach(route => {
  router.use(route.path, route.route)
})

router.get('/status', (req, res) => {
  res.status(StatusCodes.OK).json({
    success: true,
    message: 'Server is running smoothly',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
  })
})

export default router
