'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.AuthHelper = void 0
const jwtHelper_1 = require('../../../helpers/jwtHelper')
const config_1 = __importDefault(require('../../../config'))
const bcrypt_1 = __importDefault(require('bcrypt'))
const createToken = (authId, role, name, email, deviceToken, rememberMe) => {
  const accessToken = jwtHelper_1.jwtHelper.createToken(
    { authId, role, name, email, deviceToken },
    config_1.default.jwt.jwt_secret,
    config_1.default.jwt.jwt_expire_in,
  )
  const refreshExpiry = rememberMe
    ? config_1.default.jwt.jwt_refresh_expire_long
    : config_1.default.jwt.jwt_refresh_expire_in
  const refreshToken = jwtHelper_1.jwtHelper.createToken(
    { authId, role, name, email, deviceToken },
    config_1.default.jwt.jwt_refresh_secret,
    refreshExpiry,
  )
  return { accessToken, refreshToken }
}
const isPasswordMatched = async (plainTextPassword, hashedPassword) => {
  return await bcrypt_1.default.compare(plainTextPassword, hashedPassword)
}
exports.AuthHelper = { createToken, isPasswordMatched }
