import { StatusCodes } from 'http-status-codes'
import { User } from '../../user/user.model'
import { AuthHelper } from '../auth.helper'
import ApiError from '../../../../errors/ApiError'
import { USER_ROLES, USER_STATUS } from '../../../../enum/user'
import config from '../../../../config'
import { Token } from '../../token/token.model'
import { IAuthResponse, IResetPassword } from '../auth.interface'
import { emailTemplate } from '../../../../shared/emailTemplate'
import cryptoToken, {
  compareOtp,
  generateOtp,
  hashOtp,
} from '../../../../utils/crypto'
import {
  SocialProvider,
  verifySocialIdToken,
} from '../socialAuth.helper'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { ILoginData } from '../../../../interfaces/auth'
import { AuthCommonServices, authResponse } from '../common'
import { jwtHelper } from '../../../../helpers/jwtHelper'
import { JwtPayload } from 'jsonwebtoken'
import { IUser } from '../../user/user.interface'
import { emailHelper } from '../../../../helpers/emailHelper'
// import { emailQueue } from '../../../../helpers/bull-mq-producer'

const createUser = async (payload: IUser) => {
  payload.email = payload.email?.toLowerCase().trim()
  const isUserExist = await User.findOne({
    email: payload.email,
    status: { $nin: [USER_STATUS.DELETED] },
  })

  if (isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `An account with this email already exist, please login or try with another email.`,
    )
  }

  const otp = generateOtp()
  const otpExpiresIn = new Date(Date.now() + 5 * 60 * 1000)

  const authentication = {
    email: payload.email,
    oneTimeCode: hashOtp(otp),
    expiresAt: otpExpiresIn,
    latestRequestAt: new Date(),
    requestCount: 1,
    authType: 'createAccount',
    isVerified: false,
  }

  // Send email with OTP
  const createAccount = emailTemplate.createAccount({
    name: payload.name!,
    email: payload.email!.toLowerCase().trim(),
    otp,
  })

  emailHelper.sendEmail(createAccount)

  const user = await User.create({
    ...payload,
    password: payload.password,
    authentication,
  })

  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user.')
  }

  return {
    success: true,
    message: 'Registration successful and OTP sent to your email',
    data: {
      email: user.email,
    },
  }
}

const customLogin = async (payload: ILoginData): Promise<IAuthResponse> => {
  const { email, phone } = payload
  const query = email ? { email: email.toLowerCase().trim() } : { phone: phone }

  const isUserExist = await User.findOne({
    ...query,
    status: { $in: [USER_STATUS.ACTIVE] },
  })
    .select('+password +authentication')
    .lean()
  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  if (!isUserExist.password) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  const result = await AuthCommonServices.handleLoginLogic(payload, isUserExist)

  return result
}

const adminLogin = async (payload: ILoginData): Promise<IAuthResponse> => {
  const { email, phone } = payload
  const query = email ? { email: email.trim().toLowerCase() } : { phone: phone }

  const isUserExist = await User.findOne({
    ...query,
  })
    .select('+password +authentication')
    .lean()
  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  if (
    isUserExist.role !== USER_ROLES.ADMIN &&
    isUserExist.role !== USER_ROLES.SUPER_ADMIN
  ) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  if (isUserExist.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  const isPasswordMatch = await AuthHelper.isPasswordMatched(
    payload.password,
    isUserExist.password as string,
  )
  if (!isPasswordMatch) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid email or password',
    )
  }

  //tokens
  const tokens = AuthHelper.createToken(
    isUserExist._id,
    isUserExist.role,
    isUserExist.name!,
    isUserExist.email!,
  )

  return authResponse(
    StatusCodes.OK,
    `Welcome back ${isUserExist.name}`,
    isUserExist.role,
    tokens.accessToken,
    tokens.refreshToken,
  )
}

const forgetPassword = async (email?: string, phone?: string) => {
  if (phone && !email) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Password reset via phone is not available. Please use email.',
    )
  }

  if (!email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email is required')
  }

  const isUserExist = await User.findOne({
    email: email.toLowerCase().trim(),
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE] },
  })

  if (!isUserExist) {
    return 'If an account exists, an OTP has been sent.'
  }

  const otp = generateOtp()

  const authentication = {
    email: isUserExist.email,
    resetPassword: true,
    oneTimeCode: hashOtp(otp),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    latestRequestAt: new Date(),
    requestCount: 1,
    authType: 'resetPassword',
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    {
      $set: { authentication: authentication },
    },
    { new: true },
  )

  const forgetPasswordEmailTemplate = emailTemplate.resetPassword({
    name: isUserExist.name as string,
    email: isUserExist.email as string,
    otp,
  })

  emailHelper.sendEmail(forgetPasswordEmailTemplate)

  return 'If an account exists, an OTP has been sent.'
}

const resetPassword = async (resetToken: string, payload: IResetPassword) => {
  const { newPassword, confirmPassword } = payload
  if (newPassword !== confirmPassword) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Passwords do not match')
  }

  const normalizedToken = resetToken?.startsWith('Bearer ')
    ? resetToken.split(' ')[1]
    : resetToken

  const isTokenExist = await Token.findOne({ token: normalizedToken }).lean()

  if (!isTokenExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You don't have authorization to reset your password, please verify your account first.",
    )
  }

  const isUserExist = await User.findById(isTokenExist.user)
    .select('+authentication')
    .lean()

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Something went wrong, please try again. or contact support.',
    )
  }

  const { authentication } = isUserExist
  if (!authentication?.resetPassword) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You don\'t have permission to change the password. Please click again to "Forgot Password"',
    )
  }

  const isTokenValid = isTokenExist?.expireAt > new Date()
  if (!isTokenValid) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your reset token has expired, please try again.',
    )
  }

  const hashPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  )
  const updatedUserData = {
    password: hashPassword,
    authentication: {
      resetPassword: false,
      otp: '',
      expiresAt: null,
      latestRequestAt: null,
      requestCount: 0,
      authType: '',
      passwordChangedAt: new Date(),
    },
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    { $set: updatedUserData },
    { new: true },
  )

  return { message: 'Password reset successfully' }
}

const verifyAccount = async (
  email: string,
  onetimeCode: string,
): Promise<IAuthResponse> => {
  //verify fo new user
  if (!onetimeCode) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP is required.')
  }
  const isUserExist = await User.findOne({
    email: email.toLowerCase().trim(),
    status: { $nin: [USER_STATUS.DELETED] },
  })
    .select('+password +authentication')
    .lean()

  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email}, please register first.`,
    )
  }

  const { authentication } = isUserExist

  const storedOtp = authentication?.oneTimeCode
  const otpMatches = storedOtp
    ? storedOtp.length === 64
      ? compareOtp(onetimeCode, storedOtp)
      : storedOtp === onetimeCode
    : false

  if (!otpMatches) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid OTP, please try again.',
    )
  }

  const currentDate = new Date()
  if (authentication?.expiresAt && authentication.expiresAt < currentDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'OTP has expired, please try again.',
    )
  }

  //either newly created user or existing user
  if (!isUserExist.verified) {
    await User.findByIdAndUpdate(
      isUserExist._id,
      { $set: { verified: true } },
      { new: true },
    )

    const tokens = AuthHelper.createToken(
      isUserExist._id,
      isUserExist.role,
      isUserExist.name,
      isUserExist.email,
    )

    return authResponse(
      StatusCodes.OK,
      `Welcome ${isUserExist.name} to our platform.`,
      isUserExist.role,
      tokens.accessToken,
      tokens.refreshToken,
    )
  } else {
    await User.findByIdAndUpdate(
      isUserExist._id,
      {
        $set: {
          authentication: {
            oneTimeCode: '',
            expiresAt: null,
            latestRequestAt: null,
            requestCount: 0,
            authType: '',
            resetPassword: true,
          },
        },
      },
      { new: true },
    )

    const token = await Token.create({
      token: cryptoToken(),
      user: isUserExist._id,
      expireAt: new Date(Date.now() + 5 * 60 * 1000), // 15 minutes
    })

    if (!token) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Something went wrong, please try again. or contact support.',
      )
    }

    return authResponse(
      StatusCodes.OK,
      'OTP verified successfully, please reset your password.',
      undefined,
      undefined,
      undefined,
      token?.token,
    )
  }
}

const getRefreshToken = async (token: string) => {
  try {
    const decodedToken = jwtHelper.verifyToken(
      token,
      config.jwt.jwt_refresh_secret as string,
    )

    const { authId, role } = decodedToken
    const userId = authId || decodedToken.userId

    const dbUser = await User.findById(userId).select('+authentication')
    if (!dbUser || dbUser.status !== USER_STATUS.ACTIVE) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account is not active')
    }

    if (
      decodedToken.iat &&
      dbUser.authentication?.passwordChangedAt &&
      decodedToken.iat * 1000 < dbUser.authentication.passwordChangedAt.getTime()
    ) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Session has been revoked, please login again',
      )
    }

    const tokens = AuthHelper.createToken(
      userId,
      role,
      decodedToken.name,
      decodedToken.email,
    )

    return {
      accessToken: tokens.accessToken,
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh Token has expired')
    }
    throw new ApiError(StatusCodes.FORBIDDEN, 'Invalid Refresh Token')
  }
}

const socialLogin = async (
  provider: SocialProvider,
  idToken: string,
  deviceToken: string,
): Promise<IAuthResponse> => {
  const identity = await verifySocialIdToken(provider, idToken)

  let isUserExist = await User.findOne({
    appId: identity.appId,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE] },
  })

  if (
    !isUserExist &&
    identity.email &&
    identity.emailVerified
  ) {
    isUserExist = await User.findOne({
      email: identity.email,
      status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE] },
    })
  }

  if (!isUserExist) {
    if (!identity.email) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Social login did not provide a verified email',
      )
    }

    const createdUser = await User.create({
      appId: identity.appId,
      email: identity.email,
      name: identity.name,
      deviceToken,
      provider,
      status: USER_STATUS.ACTIVE,
      verified: true,
      password: crypto.randomUUID(),
    })
    if (!createdUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user.')
    }
    const tokens = AuthHelper.createToken(
      createdUser._id,
      createdUser.role,
      createdUser.name,
      createdUser.email,
    )
    return authResponse(
      StatusCodes.OK,
      `Welcome ${createdUser.name} to our platform.`,
      createdUser.role,
      tokens.accessToken,
      tokens.refreshToken,
    )
  }

  if (isUserExist.status !== USER_STATUS.ACTIVE) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account is not active')
  }

  await User.findByIdAndUpdate(isUserExist._id, {
    $set: {
      deviceToken,
      appId: identity.appId,
      provider,
    },
  })

  const tokens = AuthHelper.createToken(
    isUserExist._id,
    isUserExist.role,
    isUserExist.name,
    isUserExist.email,
  )
  return authResponse(
    StatusCodes.OK,
    `Welcome back ${isUserExist.name}`,
    isUserExist.role,
    tokens.accessToken,
    tokens.refreshToken,
  )
}

const resendOtpToPhoneOrEmail = async (
  authType: 'resetPassword' | 'createAccount',
  email?: string,
  phone?: string,
) => {
  const query = email ? { email: email } : { phone: phone }
  const isUserExist = await User.findOne({
    ...query,
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE] },
  }).select('+authentication')
  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `No account found with this ${email ? 'email' : 'phone'}`,
    )
  }

  if (phone && !email) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Phone verification is not available. Please use email.',
    )
  }

  const { authentication } = isUserExist
  const windowMs = 15 * 60 * 1000
  let requestCount = authentication?.requestCount || 0
  if (
    authentication?.latestRequestAt &&
    Date.now() - new Date(authentication.latestRequestAt).getTime() > windowMs
  ) {
    requestCount = 0
  }

  if (requestCount >= 5) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have exceeded the maximum number of requests. Please try again later.',
    )
  }

  const otp = generateOtp()
  const updatedAuthentication = {
    oneTimeCode: hashOtp(otp),
    latestRequestAt: new Date(),
    requestCount: requestCount + 1,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    authType,
  }

  if (email) {
    const template = emailTemplate.resendOtp({
      email: isUserExist.email as string,
      name: isUserExist.name as string,
      otp,
      type: authType,
    })
    emailHelper.sendEmail(template)

    await User.findByIdAndUpdate(
      isUserExist._id,
      {
        $set: { authentication: updatedAuthentication },
      },
      { new: true },
    )
  }
}

const deleteAccount = async (user: JwtPayload, password: string) => {
  const { authId } = user
  const isUserExist = await User.findById(authId).select('+password')
  if (!isUserExist) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Failed to delete account. Please try again.',
    )
  }

  if (isUserExist.status === USER_STATUS.DELETED) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Requested user is already deleted.',
    )
  }

  const isPasswordMatched = await bcrypt.compare(password, isUserExist.password)

  if (!isPasswordMatched) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please provide a valid password to delete your account.',
    )
  }

  const deletedData = await User.findByIdAndUpdate(authId, {
    $set: {
      status: USER_STATUS.DELETED,
      'authentication.passwordChangedAt': new Date(),
    },
  })

  return {
    status: StatusCodes.OK,
    message: 'Account deleted successfully.',
    deletedData,
  }
}

const resendOtp = async (
  email: string,
  authType: 'createAccount' | 'resetPassword',
) => {
  const isUserExist = await User.findOne({
    email: email.toLowerCase().trim(),
    status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE] },
  }).select('+authentication')
  if (!isUserExist) {
    return 'If an account exists, an OTP has been sent.'
  }

  const { authentication } = isUserExist
  const windowMs = 15 * 60 * 1000
  let requestCount = authentication?.requestCount || 0
  if (
    authentication?.latestRequestAt &&
    Date.now() - new Date(authentication.latestRequestAt).getTime() > windowMs
  ) {
    requestCount = 0
  }

  if (requestCount >= 5) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'You have exceeded the maximum number of requests. Please try again later.',
    )
  }

  const otp = generateOtp()
  const authenticationPayload = {
    oneTimeCode: hashOtp(otp),
    latestRequestAt: new Date(),
    requestCount: requestCount + 1,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    authType,
  }

  await User.findByIdAndUpdate(
    isUserExist._id,
    {
      $set: { authentication: authenticationPayload },
    },
    { new: true },
  )

  const forgetPasswordEmailTemplate = emailTemplate.resendOtp({
    email: email as string,
    name: isUserExist.name as string,
    otp,
    type: authType,
  })

  emailHelper.sendEmail(forgetPasswordEmailTemplate)

  return 'If an account exists, an OTP has been sent.'
}

const changePassword = async (
  user: JwtPayload,
  currentPassword: string,
  newPassword: string,
) => {
  // Find the user with password field
  const isUserExist = await User.findById(user.authId)
    .select('+password')
    .lean()

  if (!isUserExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
  }

  // Check if current password matches
  const isPasswordMatch = await AuthHelper.isPasswordMatched(
    currentPassword,
    isUserExist.password as string,
  )

  if (!isPasswordMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Current password is incorrect')
  }

  // Hash the new password
  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.bcrypt_salt_rounds),
  )

  // Update the password
  await User.findByIdAndUpdate(
    user.authId,
    {
      password: hashedPassword,
      'authentication.passwordChangedAt': new Date(),
    },
    { new: true },
  )

  return { message: 'Password changed successfully' }
}

export const CustomAuthServices = {
  adminLogin,
  forgetPassword,
  resetPassword,
  verifyAccount,
  customLogin,
  getRefreshToken,
  socialLogin,
  resendOtpToPhoneOrEmail,
  deleteAccount,
  resendOtp,
  changePassword,
  createUser,
}
