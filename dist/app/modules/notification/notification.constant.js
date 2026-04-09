'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.EMAIL_SUBJECTS =
  exports.NOTIFICATION_CONFIG =
  exports.NOTIFICATION_TEMPLATES =
  exports.notificationFilterableFields =
  exports.notificationSearchableFields =
    void 0
const notification_interface_1 = require('./notification.interface')
exports.notificationSearchableFields = ['title', 'content', 'targetAudience']
exports.notificationFilterableFields = [
  'searchTerm',
  'userId',
  'targetAudience',
  'type',
  'channel',
  'status',
  'priority',
  'isRead',
  'isArchived',
  'startDate',
  'endDate',
]
exports.NOTIFICATION_TEMPLATES = {
  // User Templates
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  ACCOUNT_VERIFICATION: 'account-verification',
  PROFILE_UPDATED: 'profile-updated',
  // System Templates
  SYSTEM_ALERT: 'system-alert',
  MAINTENANCE: 'maintenance',
  NEW_FEATURE: 'new-feature',
}
exports.NOTIFICATION_CONFIG = {
  // Priority levels with default channel
  PRIORITY_CONFIG: {
    [notification_interface_1.NotificationPriority.URGENT]: {
      channel: notification_interface_1.NotificationChannel.BOTH,
      retryAttempts: 3,
    },
    [notification_interface_1.NotificationPriority.HIGH]: {
      channel: notification_interface_1.NotificationChannel.BOTH,
      retryAttempts: 2,
    },
    [notification_interface_1.NotificationPriority.MEDIUM]: {
      channel: notification_interface_1.NotificationChannel.EMAIL,
      retryAttempts: 1,
    },
    [notification_interface_1.NotificationPriority.LOW]: {
      channel: notification_interface_1.NotificationChannel.IN_APP,
      retryAttempts: 0,
    },
  },
  // Default settings
  DEFAULT_CHANNEL: notification_interface_1.NotificationChannel.IN_APP,
  DEFAULT_PRIORITY: notification_interface_1.NotificationPriority.MEDIUM,
  DEFAULT_RETRY_DELAY: 30000, // 30 seconds
  MAX_RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 50,
  // Scheduled notification settings
  SCHEDULED_CHECK_INTERVAL: 60000, // 1 minute
  CLEANUP_ARCHIVED_AFTER_DAYS: 30,
}
exports.EMAIL_SUBJECTS = {
  [notification_interface_1.NotificationType.WELCOME]: 'Welcome to EventHub!',
  [notification_interface_1.NotificationType.PASSWORD_RESET]:
    'Password Reset Request',
  [notification_interface_1.NotificationType.ACCOUNT_VERIFICATION]:
    'Verify Your Account',
  [notification_interface_1.NotificationType.SYSTEM_ALERT]: 'System Alert',
}
