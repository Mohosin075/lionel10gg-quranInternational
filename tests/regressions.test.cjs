require('ts-node/register/transpile-only')
const { test, afterEach, mock } = require('node:test')
const assert = require('node:assert/strict')
const { z } = require('zod')
const { User } = require('../src/app/modules/user/user.model')
const { AuthHelper } = require('../src/app/modules/auth/auth.helper')
const { emailHelper } = require('../src/helpers/emailHelper')
const { AuthCommonServices } = require('../src/app/modules/auth/common')
const {
  CustomAuthServices,
} = require('../src/app/modules/auth/custom.auth/custom.auth.service')
const { AuthValidations } = require('../src/app/modules/auth/auth.validation')
const { updateUserSchema } = require('../src/app/modules/user/user.validation')
const { UserController } = require('../src/app/modules/user/user.controller')
const { UserServices } = require('../src/app/modules/user/user.service')
const validateRequest = require('../src/app/middleware/validateRequest').default

afterEach(() => mock.restoreAll())
const credentials = { email: 'reader@example.com', password: 'password123' }
const makeUser = restrictionLeftAt => ({
  _id: '507f1f77bcf86cd799439011',
  ...credentials,
  role: 'user',
  name: 'Reader',
  status: 'inactive',
  verified: true,
  authentication: { restrictionLeftAt, wrongLoginAttempts: 5 },
})
const nextOrThrow = error => {
  if (error) throw error
}

test('signup validation strips privileged fields and applies parsed values', async () => {
  const req = {
    body: {
      ...credentials,
      role: 'super_admin',
      verified: true,
      subscribe: true,
    },
  }
  await validateRequest(AuthValidations.createUserZodSchema)(
    req,
    {},
    nextOrThrow,
  )
  assert.deepEqual(req.body, credentials)
  const transformed = { body: { count: '3' }, query: { untouched: 'yes' } }
  await validateRequest(
    z.object({ body: z.object({ count: z.coerce.number() }) }),
  )(transformed, {}, nextOrThrow)
  assert.equal(transformed.body.count, 3)
  assert.deepEqual(transformed.query, { untouched: 'yes' })
})

test('signup service never persists client privileges, even without middleware', async () => {
  mock.method(User, 'findOne', async () => null)
  mock.method(emailHelper, 'sendEmail', async () => {})
  let saved
  mock.method(User, 'create', async value => {
    saved = value
    return value
  })
  await CustomAuthServices.createUser({
    ...credentials,
    role: 'super_admin',
    verified: true,
    subscribe: true,
    totalHasanat: 999,
    stripeCustomerId: 'foreign',
  })
  assert.equal(saved.role, 'user')
  assert.equal(saved.verified, false)
  assert.equal(saved.subscribe, false)
  assert.equal(saved.totalHasanat, undefined)
  assert.equal(saved.stripeCustomerId, undefined)
})

test('expired temporary lock permits login and resets the failure count', async () => {
  const user = makeUser(new Date(Date.now() - 1000))
  const writes = []
  mock.method(User, 'findOne', query => {
    assert.ok(query.status.$in.includes('inactive'))
    return { select: () => ({ lean: async () => user }) }
  })
  mock.method(User, 'findByIdAndUpdate', async (id, update) => {
    writes.push(update)
    return user
  })
  mock.method(User, 'isPasswordMatched', async () => true)
  mock.method(AuthHelper, 'createToken', () => ({
    accessToken: 'access',
    refreshToken: 'refresh',
  }))
  const result = await CustomAuthServices.customLogin(credentials)
  assert.equal(result.accessToken, 'access')
  assert.equal(writes[0].$set.status, 'active')
  assert.equal(user.authentication.wrongLoginAttempts, 0)
})

test('wrong password after lock expiry starts a fresh attempt count', async () => {
  const user = makeUser(new Date(Date.now() - 1000))
  const writes = []
  mock.method(User, 'findByIdAndUpdate', async (id, update) => {
    writes.push(update)
    return user
  })
  mock.method(User, 'isPasswordMatched', async () => false)
  await assert.rejects(AuthCommonServices.handleLoginLogic(credentials, user), {
    statusCode: 401,
  })
  assert.equal(writes.at(-1).$set.status, 'active')
  assert.equal(writes.at(-1).$set['authentication.wrongLoginAttempts'], 1)
})

test('active locks and administratively inactive accounts stay blocked', async () => {
  const update = mock.method(User, 'findByIdAndUpdate', async () =>
    assert.fail('must not change account'),
  )
  await assert.rejects(
    AuthCommonServices.handleLoginLogic(
      credentials,
      makeUser(new Date(Date.now() + 600000)),
    ),
    { statusCode: 429 },
  )
  await assert.rejects(
    AuthCommonServices.handleLoginLogic(credentials, makeUser(null)),
    { statusCode: 401 },
  )
  assert.equal(update.mock.callCount(), 0)
})

test('profile upload passes strict validation and saves a publicly served image URL', async () => {
  const req = {
    body: { images: ['/uploads/images/avatar.png'] },
    user: { authId: 'reader' },
  }
  await validateRequest(updateUserSchema)(req, {}, nextOrThrow)
  let saved
  mock.method(UserServices, 'updateProfile', async (user, payload) => {
    saved = payload
    return 'ok'
  })
  const res = { status: () => res, json: () => {} }
  await UserController.updateProfile(req, res, nextOrThrow)
  assert.equal(saved.profile, '/images/avatar.png')
  assert.equal(saved.images, undefined)
  assert.equal(
    updateUserSchema.safeParse({ body: { images: [], role: 'admin' } }).success,
    false,
  )
})
