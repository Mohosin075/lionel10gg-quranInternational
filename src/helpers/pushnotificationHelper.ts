import admin from 'firebase-admin'
import config from '../config'
import { DeviceRegistration } from '../app/modules/notification/device-registration'
import { User } from '../app/modules/user/user.model'

const messaging = () => {
  if (!admin.apps.length) {
    if (!config.firebase_service_account_base64) return null
    try {
      const account = JSON.parse(Buffer.from(config.firebase_service_account_base64, 'base64').toString('utf8'))
      admin.initializeApp({ credential: admin.credential.cert(account) })
    } catch { return null }
  }
  return admin.messaging()
}
export const sendPushNotification = async (deviceToken: string, title: string, body: string, data: Record<string, string>, icon?: string) => {
  const client = messaging()
  if (!client || !deviceToken) return false
  try {
    await client.send({ token: deviceToken, notification: { title, body }, data,
      android: { notification: { channelId: 'general_notifications', ...(icon ? { icon } : {}) } },
    })
    return true
  } catch { return false }
}
export const sendPushToUsers = async (userIds: string[], title: string, body: string) => {
  const client = messaging()
  if (!client) return { configured: false, attempted: 0, accepted: 0, failed: 0 }
  const users = await User.find({ _id: { $in: userIds }, 'settings.pushNotification': { $ne: false } }).select('_id deviceToken').lean()
  const devices = await DeviceRegistration.find({ user: { $in: users.map(user => user._id) } }).lean()
  const tokens = [...new Set([...devices.map(device => device.token), ...users.map(user => user.deviceToken).filter((token): token is string => !!token)])]
  let accepted = 0, failed = 0
  for (let offset = 0; offset < tokens.length; offset += 500) {
    const batch = tokens.slice(offset, offset + 500)
    try {
      const result = await client.sendEachForMulticast({ tokens: batch, notification: { title, body }, data: { type: 'ADMIN_NOTIFICATION' }, android: { notification: { channelId: 'general_notifications' } } })
      accepted += result.successCount; failed += result.failureCount
      const invalid = result.responses.flatMap((response, i) => ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(response.error?.code || '') ? [batch[i]] : [])
      if (invalid.length) {
        await DeviceRegistration.deleteMany({ token: { $in: invalid } })
        await User.updateMany({ deviceToken: { $in: invalid } }, { $unset: { deviceToken: 1 } })
      }
    } catch { failed += batch.length }
  }
  return { configured: true, attempted: tokens.length, accepted, failed }
}
