import { JwtPayload } from 'jsonwebtoken'

export interface IUserPayload extends JwtPayload {
  authId: string
  role: string
  name?: string
  email?: string
  deviceToken?: string
}
