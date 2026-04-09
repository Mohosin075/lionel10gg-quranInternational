'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.tempAuth = void 0
const http_status_codes_1 = require('http-status-codes')
const config_1 = __importDefault(require('../../config'))
const jwtHelper_1 = require('../../helpers/jwtHelper')
const ApiError_1 = __importDefault(require('../../errors/ApiError'))
const auth =
  (...roles) =>
  async (req, res, next) => {
    var _a, _b
    try {
      const tokenWithBearer = req.headers.authorization
      if (!tokenWithBearer) {
        return next(
          new ApiError_1.default(
            http_status_codes_1.StatusCodes.UNAUTHORIZED,
            'Token not found!',
          ),
        )
      }
      if (!tokenWithBearer.startsWith('Bearer')) {
        return next(
          new ApiError_1.default(
            http_status_codes_1.StatusCodes.UNAUTHORIZED,
            'Invalid token format',
          ),
        )
      }
      const token = tokenWithBearer.split(' ')[1]
      if (!token) {
        return next(
          new ApiError_1.default(
            http_status_codes_1.StatusCodes.UNAUTHORIZED,
            'Token missing after Bearer',
          ),
        )
      }
      let verifyUser
      // FIRST: decode token
      try {
        verifyUser = jwtHelper_1.jwtHelper.verifyToken(
          token,
          config_1.default.jwt.jwt_secret,
        )
      } catch (error) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
          return next(
            new ApiError_1.default(
              http_status_codes_1.StatusCodes.UNAUTHORIZED,
              'Access Token has expired',
            ),
          )
        }
        return next(
          new ApiError_1.default(
            http_status_codes_1.StatusCodes.FORBIDDEN,
            'Invalid Access Token',
          ),
        )
      }
      // Attach to req
      req.user = verifyUser
      // SECOND: role check
      if (roles.length > 0) {
        const userRole =
          verifyUser.role ||
          ((_a = verifyUser.user) === null || _a === void 0
            ? void 0
            : _a.role) ||
          ((_b = verifyUser.data) === null || _b === void 0 ? void 0 : _b.role)
        if (!userRole) {
          return next(
            new ApiError_1.default(
              http_status_codes_1.StatusCodes.FORBIDDEN,
              'User role missing in token',
            ),
          )
        }
        if (!roles.includes(userRole)) {
          return next(
            new ApiError_1.default(
              http_status_codes_1.StatusCodes.FORBIDDEN,
              "You don't have permission to access this API",
            ),
          )
        }
      }
      // SUCCESS
      return next()
    } catch (error) {
      return next(error)
    }
  }
exports.default = auth
//this temp auth middleware is created for temporary user verification before creating a new user
//in the future, we will use the auth middleware above
const tempAuth =
  (...roles) =>
  async (req, res, next) => {
    try {
      const tokenWithBearer = req.headers.authorization
      if (!tokenWithBearer) {
        throw new ApiError_1.default(
          http_status_codes_1.StatusCodes.NOT_FOUND,
          'Token not found!',
        )
      }
      if (tokenWithBearer && tokenWithBearer.startsWith('Bearer')) {
        const token = tokenWithBearer.split(' ')[1]
        try {
          // Verify token
          const verifyUser = jwtHelper_1.jwtHelper.verifyToken(
            token,
            config_1.default.jwt.temp_jwt_secret,
          )
          // Set user to header
          req.user = verifyUser
          // Guard user
          if (roles.length && !roles.includes(verifyUser.role)) {
            throw new ApiError_1.default(
              http_status_codes_1.StatusCodes.FORBIDDEN,
              "You don't have permission to access this API",
            )
          }
          next()
        } catch (error) {
          if (error instanceof Error && error.name === 'TokenExpiredError') {
            throw new ApiError_1.default(
              http_status_codes_1.StatusCodes.UNAUTHORIZED,
              'Access Token has expired',
            )
          }
          next(error)
          throw new ApiError_1.default(
            http_status_codes_1.StatusCodes.FORBIDDEN,
            'Invalid Access Token',
          )
        }
      }
    } catch (error) {
      next(error)
    }
  }
exports.tempAuth = tempAuth
