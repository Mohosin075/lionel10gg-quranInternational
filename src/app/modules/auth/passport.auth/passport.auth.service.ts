import { USER_STATUS } from '../../../../enum/user'
import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../../errors/ApiError'
import { User } from '../../user/user.model'

import { IUser } from '../../user/user.interface'
import { AuthHelper } from '../auth.helper'
import { IAuthResponse } from '../auth.interface'
import { authResponse } from '../common'

interface GoogleProfile {
  emails: { value: string }[]
  photos: { value: string }[]
  displayName: string
  id: string
}

const handleGoogleLogin = async (
  payload: IUser & { profile: GoogleProfile },
): Promise<IAuthResponse> => {
  const { emails, photos, displayName, id } = payload.profile
  const email = emails[0].value.toLowerCase().trim()
  const isUserExist = await User.findOne({
    email,
    status: { $in: [USER_STATUS.ACTIVE] },
  })
  if (isUserExist) {
    //return only the token
    const tokens = AuthHelper.createToken(isUserExist._id, isUserExist.role)
    return authResponse(
      StatusCodes.OK,
      `Welcome ${isUserExist.name} to Quran International.`,
      isUserExist.role,
      tokens.accessToken,
      tokens.refreshToken,
    )
  }

  const session = await User.startSession()
  session.startTransaction()

  const userData = {
    email: emails[0].value,
    profile: photos[0].value,
    name: displayName,
    verified: true,
    // password: id,
    status: USER_STATUS.ACTIVE,
    appId: id,
    role: payload.role,
  }

  try {
    const user = await User.create([userData], { session })
    if (!user) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user')
    }

    //create token
    const tokens = AuthHelper.createToken(user[0]._id, user[0].role)

    await session.commitTransaction()
    session.endSession()

    return authResponse(
      StatusCodes.OK,
      `Welcome ${user[0].name} to Quran International.`,
      user[0].role,
      tokens.accessToken,
      tokens.refreshToken,
    )
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

export const PassportAuthServices = {
  handleGoogleLogin,
}
