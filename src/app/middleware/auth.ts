import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Secret } from 'jsonwebtoken'
import config from '../../config'
import { jwtHelper } from '../../helpers/jwtHelper'
import ApiError from '../../errors/ApiError'
import { User } from '../modules/user/user.model'
import { USER_STATUS } from '../../enum/user'

const isTokenInvalidated = (
  issuedAt?: number,
  invalidatedAt?: Date | null,
) => {
  if (!issuedAt || !invalidatedAt) {
    return false
  }
  return issuedAt * 1000 < invalidatedAt.getTime()
}

const assertSessionUser = async (authId?: string, issuedAt?: number) => {
  if (!authId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token payload')
  }

  const dbUser = await User.findById(authId).select('+authentication')
  if (!dbUser || dbUser.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account is not active')
  }

  if (
    isTokenInvalidated(issuedAt, dbUser.authentication?.passwordChangedAt)
  ) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Session has been revoked, please login again',
    )
  }

  return dbUser
}

const auth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization

      if (!tokenWithBearer) {
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Token not found!'))
      }

      if (!tokenWithBearer.startsWith('Bearer')) {
        return next(
          new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token format'),
        )
      }

      const token = tokenWithBearer.split(' ')[1]

      if (!token) {
        return next(
          new ApiError(StatusCodes.UNAUTHORIZED, 'Token missing after Bearer'),
        )
      }

      let verifyUser

      try {
        verifyUser = jwtHelper.verifyToken(
          token,
          config.jwt.jwt_secret as Secret,
        )
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
          return next(
            new ApiError(StatusCodes.UNAUTHORIZED, 'Access Token has expired'),
          )
        }

        return next(new ApiError(StatusCodes.FORBIDDEN, 'Invalid Access Token'))
      }

      await assertSessionUser(verifyUser.authId, verifyUser.iat)

      req.user = verifyUser

      if (roles.length > 0) {
        const userRole =
          verifyUser.role || verifyUser.user?.role || verifyUser.data?.role

        if (!userRole) {
          return next(
            new ApiError(StatusCodes.FORBIDDEN, 'User role missing in token'),
          )
        }

        if (!roles.includes(userRole)) {
          return next(
            new ApiError(
              StatusCodes.FORBIDDEN,
              "You don't have permission to access this API",
            ),
          )
        }
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }

export default auth

export const tempAuth =
  (...roles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokenWithBearer = req.headers.authorization

      if (!tokenWithBearer) {
        return next(new ApiError(StatusCodes.UNAUTHORIZED, 'Token not found!'))
      }

      if (!tokenWithBearer.startsWith('Bearer')) {
        return next(
          new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token format'),
        )
      }

      const token = tokenWithBearer.split(' ')[1]
      if (!token) {
        return next(
          new ApiError(StatusCodes.UNAUTHORIZED, 'Token missing after Bearer'),
        )
      }

      let verifyUser
      try {
        verifyUser = jwtHelper.verifyToken(
          token,
          config.jwt.temp_jwt_secret as Secret,
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
          return next(
            new ApiError(StatusCodes.UNAUTHORIZED, 'Access Token has expired'),
          )
        }
        return next(new ApiError(StatusCodes.FORBIDDEN, 'Invalid Access Token'))
      }

      req.user = verifyUser

      if (roles.length && !roles.includes(verifyUser.role)) {
        return next(
          new ApiError(
            StatusCodes.FORBIDDEN,
            "You don't have permission to access this API",
          ),
        )
      }

      return next()
    } catch (error) {
      return next(error)
    }
  }
