import crypto from 'crypto'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import { StatusCodes } from 'http-status-codes'
import config from '../../../config'
import ApiError from '../../../errors/ApiError'

export type SocialProvider = 'google' | 'apple'

export type VerifiedSocialIdentity = {
  appId: string
  email?: string
  name?: string
  emailVerified: boolean
}

const googleClient = new OAuth2Client(config.google.client_id)

const verifyGoogleIdToken = async (
  idToken: string,
): Promise<VerifiedSocialIdentity> => {
  if (!config.google.client_id) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Google sign-in is not configured',
    )
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.client_id,
    })
    const payload = ticket.getPayload()

    if (!payload?.sub) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Google ID token')
    }

    return {
      appId: payload.sub,
      email: payload.email?.toLowerCase().trim(),
      name: payload.name,
      emailVerified: Boolean(payload.email_verified),
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Google ID token')
  }
}

const verifyAppleIdToken = async (
  idToken: string,
): Promise<VerifiedSocialIdentity> => {
  const decoded = jwt.decode(idToken, { complete: true })
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Apple identity token')
  }

  const response = await fetch('https://appleid.apple.com/auth/keys')
  if (!response.ok) {
    throw new ApiError(
      StatusCodes.BAD_GATEWAY,
      'Unable to verify Apple identity token',
    )
  }

  const { keys } = (await response.json()) as {
    keys: Array<crypto.JsonWebKey & { kid?: string }>
  }
  const jwk = keys.find(key => key.kid === decoded.header.kid)
  if (!jwk) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Apple identity token')
  }

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' })
  const pem = publicKey.export({ type: 'spki', format: 'pem' })

  try {
    const payload = jwt.verify(idToken, pem, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: config.apple_client_id || undefined,
    }) as JwtPayload

    if (!payload.sub) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Invalid Apple identity token',
      )
    }

    return {
      appId: payload.sub,
      email: typeof payload.email === 'string'
        ? payload.email.toLowerCase().trim()
        : undefined,
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Apple identity token')
  }
}

export const verifySocialIdToken = async (
  provider: SocialProvider,
  idToken: string,
): Promise<VerifiedSocialIdentity> => {
  if (provider === 'google') {
    return verifyGoogleIdToken(idToken)
  }
  return verifyAppleIdToken(idToken)
}
