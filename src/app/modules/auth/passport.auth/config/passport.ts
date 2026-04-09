import passport from 'passport'
import { User } from '../../../user/user.model'
import { Strategy as LocalStrategy } from 'passport-local'
import { USER_ROLES, USER_STATUS } from '../../../../../enum/user'

import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import config from '../../../../../config'
import ApiError from '../../../../../errors/ApiError'
import { StatusCodes } from 'http-status-codes'

passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      try {
        const isUserExist = await User.findOne({
          email,
          status: { $in: [USER_STATUS.ACTIVE, USER_STATUS.INACTIVE] },
        })
          .select('+password +authentication')
          .lean()

        if (!isUserExist) {
          throw new ApiError(
            StatusCodes.BAD_REQUEST,
            'No account found with this email, please try with valid email or create an account.',
          )
        }

        return done(null, {
          ...isUserExist,
        })
      } catch (err) {
        return done(err)
      }
    },
  ),
)

passport.use(
  new GoogleStrategy(
    {
      clientID: config.google.client_id!,
      clientSecret: config.google.client_secret!,
      callbackURL: config.google.callback_url,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      req.body.profile = profile
      req.body.role = USER_ROLES.USER

      try {
        return done(null, req.body)
      } catch (err) {
        return done(err)
      }
    },
  ),
)

// Serialize the user
passport.serializeUser((data: unknown, done) => {
  // If we have a DB user, store the _id; otherwise, store the whole object for social-only login
  if (
    data &&
    typeof data === 'object' &&
    'user' in data &&
    (data as { user: { _id: string } }).user?._id
  ) {
    done(null, {
      type: 'db',
      id: (data as { user: { _id: string } }).user._id.toString(),
    })
  } else {
    done(null, { type: 'social', data }) // store social-only info
  }
})

// Deserialize the user
passport.deserializeUser(
  async (
    payload: { type: string; id?: string; data?: unknown } | null,
    done,
  ) => {
    try {
      if (payload?.type === 'db' && payload.id) {
        const user = await User.findById(payload.id)
        if (user) {
          return done(null, { user })
        }
      } else if (payload?.type === 'social' && payload.data) {
        return done(null, payload.data)
      }
      done(null, null)
    } catch (error) {
      console.error('Deserialization error:', error)
      done(error, null)
    }
  },
)

export default passport
