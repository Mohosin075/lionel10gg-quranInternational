import { JwtPayload } from 'jsonwebtoken'
import 'express-session'

declare global {
  namespace Express {
    interface Request {
      user: JwtPayload & {
        authId: string
        role: string
        name?: string
        email?: string
        deviceToken?: string
      }
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    connectType?: 'facebook' | 'instagram'
  }
}
