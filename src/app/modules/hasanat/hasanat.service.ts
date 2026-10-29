import { User } from '../user/user.model'
import ApiError from '../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

const collectHasanat = async (userId: string, amount: number) => {
  const hasanatAmount = Number(amount)
  if (
    !Number.isSafeInteger(hasanatAmount) ||
    hasanatAmount <= 0 ||
    hasanatAmount > 10000000
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid amount')
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { totalHasanat: hasanatAmount } },
    { new: true },
  )
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')

  return user
}

export const HasanatService = {
  collectHasanat,
}
