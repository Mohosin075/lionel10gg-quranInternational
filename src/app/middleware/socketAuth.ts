import { StatusCodes } from 'http-status-codes'
import ApiError from '../../errors/ApiError'
import { ErrorResponse, SocketWithUser } from '../../interfaces/socket'
import { ExtendedError } from 'socket.io'
import { jwtHelper } from '../../helpers/jwtHelper'
import { Socket } from 'socket.io'
import colors from 'colors'
import config from '../../config'
import { Secret } from 'jsonwebtoken'
import { ZodError, ZodSchema } from 'zod'
import handleZodError from '../../errors/handleZodError'
import { User } from '../modules/user/user.model'
import { USER_STATUS } from '../../enum/user'

const socketAuth = (...roles: string[]) => {
  return async (socket: SocketWithUser, next: (err?: ExtendedError) => void) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.query.token ||
        socket.handshake.headers.authorization

      if (!token) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Authentication token is required to access this resource',
        )
      }

      try {
        const jwtToken = extractToken(token)

        const verifiedUser = jwtHelper.verifyToken(
          jwtToken,
          config.jwt.jwt_secret as Secret,
        )

        const dbUser = await User.findById(verifiedUser.authId).select(
          '+authentication',
        )
        if (!dbUser || dbUser.status !== USER_STATUS.ACTIVE) {
          throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account is not active')
        }

        if (
          verifiedUser.iat &&
          dbUser.authentication?.passwordChangedAt &&
          verifiedUser.iat * 1000 <
            dbUser.authentication.passwordChangedAt.getTime()
        ) {
          throw new ApiError(
            StatusCodes.UNAUTHORIZED,
            'Session has been revoked, please login again',
          )
        }

        socket.user = {
          authId: verifiedUser.authId,
          name: verifiedUser.name,
          email: verifiedUser.email,
          role: verifiedUser.role,
          ...verifiedUser,
        }

        if (roles.length && !roles.includes(verifiedUser.role)) {
          return next(
            new ApiError(
              StatusCodes.FORBIDDEN,
              "You don't have permission to access this socket event",
            ),
          )
        }

        next()
      } catch (error) {
        if (error instanceof ApiError) {
          throw error
        }
        if (error instanceof Error && error.name === 'TokenExpiredError') {
          throw new ApiError(
            StatusCodes.UNAUTHORIZED,
            'Access Token has expired',
          )
        }
        throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Access Token')
      }
    } catch (error) {
      if (error instanceof ApiError) {
        const apiError = error as ApiError
        const errorResponse: ErrorResponse = {
          statusCode: apiError.statusCode,
          error: getErrorName(apiError.statusCode),
          message: apiError.message,
        }
        socket.emit('socket_error', errorResponse)
      }
      next(error as ExtendedError)
    }
  }
}

const handleSocketRequest = (socket: Socket, ...roles: string[]) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.query.token ||
      socket.handshake.headers.authorization

    const jwtToken = extractToken(token)

    // Verify token
    const verifiedUser = jwtHelper.verifyToken(
      jwtToken,
      config.jwt.jwt_secret as Secret,
    )
    // Guard user based on roles
    if (roles.length && !roles.includes(verifiedUser.role)) {
      socket.emit(
        'socket_error',
        createErrorResponse(
          StatusCodes.FORBIDDEN,
          "You don't have permission to access this socket event",
        ),
      )
      return null
    }

    return {
      ...verifiedUser,
    }
  } catch (error) {
    handleSocketError(socket, error)
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Access Token has expired')
    }
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Access Token')
  }
}

function createErrorResponse(
  statusCode: number,
  message: string,
  errorMessages?: Record<string, unknown>[],
): ErrorResponse {
  return {
    statusCode,
    error: getErrorName(statusCode),
    message,
    ...(errorMessages && { errorMessages }),
  }
}

function handleSocketError(socket: SocketWithUser, error: unknown): void {
  if (error instanceof ApiError) {
    socket.emit(
      'socket_error',
      createErrorResponse(error.statusCode, error.message),
    )
  } else {
    socket.emit(
      'socket_error',
      createErrorResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Internal server error',
      ),
    )
  }
  console.error(
    colors.red(
      `Socket error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    ),
    error,
  )
}

function extractToken(token: string | string[]): string {
  if (typeof token === 'string') {
    if (token.includes('{')) {
      try {
        const parsedToken = JSON.parse(token)
        return parsedToken?.token?.split(' ')[1] || parsedToken?.token || token
      } catch {
        // If parsing fails, continue with other methods
      }
    }

    if (token.startsWith('Bearer ')) {
      return token.split(' ')[1]
    }
  }
  return token as string
}

function getErrorName(statusCode: number): string {
  switch (statusCode) {
    case StatusCodes.BAD_REQUEST:
      return 'Bad Request'
    case StatusCodes.UNAUTHORIZED:
      return 'Unauthorized'
    case StatusCodes.FORBIDDEN:
      return 'Forbidden'
    case StatusCodes.NOT_FOUND:
      return 'Not Found'
    default:
      return 'Error'
  }
}

/**
 * Validate socket event data against schema
 */
const validateEventData = <T>(
  socket: Socket,
  schema: ZodSchema,
  data: unknown,
): T | null => {
  try {
    return schema.parse(data) as T
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const zodError = handleZodError(error)
      socket.emit('socket_error', {
        statusCode: zodError.statusCode,
        success: false,
        message: zodError.message,
        errorMessages: zodError.errorMessages,
      })
    } else {
      socket.emit('socket_error', {
        statusCode: StatusCodes.BAD_REQUEST,
        success: false,
        message: 'Validation failed',
      })
    }
    return null
  }
}

export const socketMiddleware = {
  socketAuth,
  validateEventData,
  handleSocketRequest,
}
