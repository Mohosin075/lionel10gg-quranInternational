import { Types } from 'mongoose'
import { Token } from './token.model'
import { User } from '../user/user.model'

const logout = async (userId: string) => {
  const [tokenResult] = await Promise.all([
    Token.updateMany(
      {
        user: new Types.ObjectId(userId),
      },
      {
        expireAt: new Date(),
        token: '',
      },
    ),
    User.findByIdAndUpdate(userId, {
      $set: { 'authentication.passwordChangedAt': new Date() },
    }),
  ])

  return tokenResult
}
export const TokenServices = {
  logout,
}
