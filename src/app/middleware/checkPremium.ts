import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { User } from '../modules/user/user.model'
import { USER_ROLES } from '../../enum/user'
import { JwtPayload } from 'jsonwebtoken'

export const checkPremium = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = req.user as JwtPayload

    if (!user) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Unauthorized access!'))
    }

    const userRole = user.role

    // Admins and Super Admins bypass subscription checks
    if (userRole === USER_ROLES.SUPER_ADMIN || userRole === USER_ROLES.ADMIN) {
      return next()
    }

    // Fetch user from DB to verify current subscription state
    const userId = user.authId
    if (!userId) {
      return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token payload'))
    }

    const dbUser = await User.findById(userId)
    if (!dbUser) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found!'))
    }

    const isSubscriptionActive =
      dbUser.subscriptionStatus === 'active' &&
      dbUser.subscriptionExpiresAt &&
      new Date(dbUser.subscriptionExpiresAt) > new Date()

    if (!isSubscriptionActive) {
      return next(
        new ApiError(
          StatusCodes.PAYMENT_REQUIRED,
          'Premium subscription required to access this feature',
        ),
      )
    }

    next()
  } catch (error) {
    next(error)
  }
}
