'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.NotificationServices = void 0
const http_status_codes_1 = require('http-status-codes')
const ApiError_1 = __importDefault(require('../../../errors/ApiError'))
const notification_interface_1 = require('./notification.interface')
const notification_model_1 = require('./notification.model')
const paginationHelper_1 = require('../../../helpers/paginationHelper')
const notification_constant_1 = require('./notification.constant')
const mongoose_1 = require('mongoose')
const notification_providers_1 = require('./notification.providers')
const user_model_1 = require('../user/user.model')
const config_1 = __importDefault(require('../../../config'))
const server_1 = require('../../../server')
const createNotification = async (payload, sendEmail = false) => {
  try {
    const notificationData = {
      userId: payload.userId,
      title: payload.title,
      content: payload.content,
      type: payload.type,
      channel:
        payload.channel || notification_interface_1.NotificationChannel.IN_APP,
      priority: payload.priority,
      metadata: payload.metadata || {},
      actionUrl: payload.actionUrl,
      actionText: payload.actionText,
    }
    if (payload.scheduledAt) {
      notificationData.scheduledAt = payload.scheduledAt
      notificationData.status =
        notification_interface_1.NotificationStatus.PENDING
    }
    const notification =
      await notification_model_1.Notification.create(notificationData)
    // Send real-time notification via socket
    if (
      notification.channel !==
        notification_interface_1.NotificationChannel.EMAIL &&
      notification.userId
    ) {
      // Emit socket event for real-time notification
      if (server_1.io) {
        server_1.io.to(notification.userId.toString()).emit('notification', {
          type: 'NEW_NOTIFICATION',
          data: notification,
        })
      }
    }
    // Send email if requested
    if (
      sendEmail &&
      notification.channel !==
        notification_interface_1.NotificationChannel.IN_APP
    ) {
      // Ensure notification.userId exists before sending email
      if (notification.userId) {
        await sendNotificationEmail(notification)
      } else {
        console.warn(
          'Cannot send email for notification without userId:',
          notification._id,
        )
      }
    }
    return notification
  } catch (error) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
const sendNotificationEmail = async notification => {
  var _a, _b
  try {
    const user = await user_model_1.User.findById(notification.userId)
    if (!user || !user.email) {
      throw new Error('User not found or no email available')
    }
    let template = 'system-alert'
    const templateData = {
      userName: user.name,
      notificationTitle: notification.title,
      notificationContent: notification.content,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
    }
    // Map notification type to template and add specific data
    switch (notification.type) {
      case notification_interface_1.NotificationType.WELCOME:
        template = 'welcome'
        break
      case notification_interface_1.NotificationType.PASSWORD_RESET:
        template = 'password-reset'
        if (
          (_a = notification.metadata) === null || _a === void 0
            ? void 0
            : _a.resetCode
        ) {
          templateData.resetCode = notification.metadata.resetCode
          templateData.expiryMinutes = 30
        }
        break
      case notification_interface_1.NotificationType.ACCOUNT_VERIFICATION:
        template = 'account-verification'
        if (
          (_b = notification.metadata) === null || _b === void 0
            ? void 0
            : _b.verificationToken
        ) {
          templateData.verificationUrl = `${config_1.default.clientUrl}/verify-email?token=${notification.metadata.verificationToken}`
        }
        break
      default:
        template = 'system-alert'
    }
    await notification_providers_1.emailProvider.sendTemplateEmail(
      user.email,
      template,
      templateData,
      notification.title,
    )
    // Update notification status
    await notification_model_1.Notification.findByIdAndUpdate(
      notification._id,
      {
        status: notification_interface_1.NotificationStatus.SENT,
        sentAt: new Date(),
      },
    )
  } catch (error) {
    console.error('Failed to send notification email:', error)
    // Update notification status to failed
    await notification_model_1.Notification.findByIdAndUpdate(
      notification._id,
      {
        status: notification_interface_1.NotificationStatus.FAILED,
        metadata: {
          ...notification.metadata,
          emailError: error instanceof Error ? error.message : 'Unknown error',
        },
      },
    )
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to send email notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
const getAllNotifications = async (user, filterables, pagination) => {
  const { searchTerm, ...filterData } = filterables
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper_1.paginationHelper.calculatePagination(pagination)
  const andConditions = []
  // Search term
  if (searchTerm) {
    andConditions.push({
      $or: notification_constant_1.notificationSearchableFields.map(field => ({
        [field]: {
          $regex: searchTerm,
          $options: 'i',
        },
      })),
    })
  }
  // Filter by other fields
  if (Object.keys(filterData).length) {
    const filterEntries = Object.entries(filterData)
    filterEntries.forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'startDate' || key === 'endDate') {
          // Date filtering - ensure value is string
          const dateCondition = {}
          if (key === 'startDate' && typeof value === 'string') {
            dateCondition.$gte = new Date(value)
          }
          if (key === 'endDate' && typeof value === 'string') {
            dateCondition.$lte = new Date(value)
          }
          if (Object.keys(dateCondition).length > 0) {
            andConditions.push({ createdAt: dateCondition })
          }
        } else if (key === 'isRead' || key === 'isArchived') {
          // Boolean filtering - convert string to boolean
          andConditions.push({ [key]: value === 'true' })
        } else {
          // Regular field filtering
          andConditions.push({ [key]: value })
        }
      }
    })
  }
  // User-specific filtering (unless admin)
  if (user.role === 'user') {
    andConditions.push({
      $or: [
        { userId: new mongoose_1.Types.ObjectId(user.authId) },
        { targetAudience: notification_interface_1.TARGET_AUDIENCE.ALL_USER },
        {
          targetAudience: notification_interface_1.TARGET_AUDIENCE.ACTIVE_USER,
        },
      ],
    })
  } else if (user.role === 'organizer') {
    andConditions.push({
      $or: [
        { userId: new mongoose_1.Types.ObjectId(user.authId) },
        { targetAudience: notification_interface_1.TARGET_AUDIENCE.ALL_USER },
        {
          targetAudience: notification_interface_1.TARGET_AUDIENCE.ACTIVE_USER,
        },
        { targetAudience: notification_interface_1.TARGET_AUDIENCE.ORGANIZER },
      ],
    })
  }
  const whereConditions = andConditions.length ? { $and: andConditions } : {}
  const [result, total, analyticsData] = await Promise.all([
    notification_model_1.Notification.find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .populate('userId', 'name email')
      .lean(),
    notification_model_1.Notification.countDocuments(whereConditions),
    // Get overall analytics for the filtered notifications
    notification_model_1.Notification.aggregate([
      { $match: whereConditions },
      {
        $group: {
          _id: null,
          totalNotifications: { $sum: 1 },
          readNotifications: {
            $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] },
          },
          clickedNotifications: {
            $sum: { $cond: [{ $ne: ['$actionClickedAt', null] }, 1, 0] },
          },
        },
      },
    ]),
  ])
  const stats = analyticsData[0] || {
    totalNotifications: 0,
    readNotifications: 0,
    clickedNotifications: 0,
  }
  const overallAnalytics = {
    openRate:
      stats.totalNotifications > 0
        ? Math.round((stats.readNotifications / stats.totalNotifications) * 100)
        : 0,
    engagement:
      stats.totalNotifications > 0
        ? Math.round(
            (stats.clickedNotifications / stats.totalNotifications) * 100,
          )
        : 0,
  }
  // Add individual analytics to each notification
  const notificationsWithAnalytics = result.map(notification => ({
    ...notification,
    analytics: {
      openRate: notification.isRead ? 100 : 0, // Individual notification is either open (100%) or not (0%)
      engagement: notification.actionClickedAt ? 100 : 0, // Individual notification action is either clicked (100%) or not (0%)
    },
  }))
  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    analytics: overallAnalytics, // Overall analytics for all notifications matching the query
    data: notificationsWithAnalytics,
  }
}
const getNotificationById = async id => {
  if (!mongoose_1.Types.ObjectId.isValid(id)) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Invalid notification ID',
    )
  }
  const result = await notification_model_1.Notification.findById(id)
    .populate('userId', 'name email')
    .lean()
  if (!result) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'Notification not found',
    )
  }
  return result
}
const updateNotification = async (id, payload, userId) => {
  if (!mongoose_1.Types.ObjectId.isValid(id)) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Invalid notification ID',
    )
  }
  const query = { _id: id }
  if (userId) {
    query.userId = userId
  }
  const result = await notification_model_1.Notification.findOneAndUpdate(
    query,
    { $set: payload },
    { new: true, runValidators: true },
  )
    .populate('userId', 'name email')
    .lean()
  if (!result) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'Notification not found',
    )
  }
  return result
}
const markAsRead = async (id, userId) => {
  const result = await notification_model_1.Notification.findOneAndUpdate(
    { _id: id, userId },
    {
      isRead: true,
      readAt: new Date(),
      status: notification_interface_1.NotificationStatus.READ,
    },
    { new: true },
  )
    .populate('userId', 'name email')
    .lean()
  if (!result) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'Notification not found',
    )
  }
  return result
}
const markAllAsRead = async userId => {
  const result = await notification_model_1.Notification.updateMany(
    { userId, isRead: false },
    {
      isRead: true,
      readAt: new Date(),
      status: notification_interface_1.NotificationStatus.READ,
    },
  )
  return { modifiedCount: result.modifiedCount }
}
const archiveNotification = async (id, userId) => {
  const result = await notification_model_1.Notification.findOneAndUpdate(
    { _id: id, userId },
    { isArchived: true },
    { new: true },
  )
    .populate('userId', 'name email')
    .lean()
  if (!result) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'Notification not found',
    )
  }
  return result
}
const deleteNotification = async id => {
  if (!mongoose_1.Types.ObjectId.isValid(id)) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.BAD_REQUEST,
      'Invalid notification ID',
    )
  }
  const result =
    await notification_model_1.Notification.findByIdAndDelete(id).lean()
  if (!result) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.NOT_FOUND,
      'Notification not found',
    )
  }
  return result
}
const getNotificationStats = async user => {
  const query = {}
  if (user.role === 'user') {
    query.$or = [
      { userId: user.authId },
      { targetAudience: notification_interface_1.TARGET_AUDIENCE.ALL_USER },
    ]
  } else if (user.role === 'organizer') {
    query.$or = [
      { userId: user.authId },
      { targetAudience: notification_interface_1.TARGET_AUDIENCE.ALL_USER },
      { targetAudience: notification_interface_1.TARGET_AUDIENCE.ORGANIZER },
    ]
  }
  const [total, unread, byType, byChannel, byStatus] = await Promise.all([
    notification_model_1.Notification.countDocuments(query),
    notification_model_1.Notification.countDocuments({
      ...query,
      isRead: false,
    }),
    notification_model_1.Notification.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    notification_model_1.Notification.aggregate([
      { $match: query },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
    ]),
    notification_model_1.Notification.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ])
  const stats = {
    total,
    unread,
    byType: {},
    byChannel: {},
    byStatus: {},
  }
  byType.forEach(item => {
    stats.byType[item._id] = item.count
  })
  byChannel.forEach(item => {
    stats.byChannel[item._id] = item.count
  })
  byStatus.forEach(item => {
    stats.byStatus[item._id] = item.count
  })
  return stats
}
const getMyNotifications = async (user, pagination) => {
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper_1.paginationHelper.calculatePagination(pagination)
  const query = {
    $or: [
      { userId: new mongoose_1.Types.ObjectId(user.authId) },
      { targetAudience: notification_interface_1.TARGET_AUDIENCE.ALL_USER },
    ],
    isArchived: false,
  }
  // Add role-specific broadcast logic
  if (user.role === 'organizer') {
    query.$or.push({
      targetAudience: notification_interface_1.TARGET_AUDIENCE.ORGANIZER,
    })
  }
  // Active status logic (assuming active users have specific status in JWT or we fetch it)
  // For now, including active user broadcasts for everyone since they are 'active' if logged in
  query.$or.push({
    targetAudience: notification_interface_1.TARGET_AUDIENCE.ACTIVE_USER,
  })
  const [result, total] = await Promise.all([
    notification_model_1.Notification.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .lean(),
    notification_model_1.Notification.countDocuments(query),
  ])
  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  }
}
const sendTestEmail = async (to, template) => {
  try {
    const user = await user_model_1.User.findOne({ email: to })
    if (!user) {
      throw new ApiError_1.default(
        http_status_codes_1.StatusCodes.NOT_FOUND,
        'User not found',
      )
    }
    const testData = {
      userName: user.name,
      eventTitle: 'Test Event - Annual Tech Conference 2024',
      eventDate: new Date().toLocaleDateString(),
      eventTime: new Date().toLocaleTimeString(),
      eventLocation: 'Convention Center, New York',
      ticketType: 'VIP Pass',
      quantity: 1,
      orderId: 'TEST123456',
      amount: '99.99',
      currency: 'USD',
      qrCodeUrl:
        'https://via.placeholder.com/200x200/667eea/ffffff?text=QR+CODE',
      resetCode: 'ABC123',
      verificationUrl: `${config_1.default.clientUrl}/verify-email?token=test-token-123`,
      actionUrl: `${config_1.default.clientUrl}/dashboard`,
      actionText: 'Go to Dashboard',
    }
    await notification_providers_1.emailProvider.sendTemplateEmail(
      to,
      template,
      testData,
    )
    return true
  } catch (error) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
const sendManualNotification = async payload => {
  try {
    // Create a single broadcast notification record
    const notificationData = {
      title: payload.title,
      content: payload.content,
      type:
        payload.type || notification_interface_1.NotificationType.SYSTEM_ALERT,
      channel:
        payload.channel || notification_interface_1.NotificationChannel.IN_APP,
      priority:
        payload.priority ||
        notification_interface_1.NotificationPriority.MEDIUM,
      targetAudience:
        payload.targetAudience ||
        notification_interface_1.TARGET_AUDIENCE.ACTIVE_USER,
      actionUrl: payload.actionUrl,
      actionText: payload.actionText,
      status: notification_interface_1.NotificationStatus.SENT, // Broadcasts are usually sent immediately
      sentAt: new Date(),
    }
    const notification =
      await notification_model_1.Notification.create(notificationData)
    // Emit broadcast socket event based on target audience
    if (
      payload.channel !== notification_interface_1.NotificationChannel.EMAIL
    ) {
      if (server_1.io) {
        // We can emit to specific rooms based on role if needed,
        // but for now, we'll use a generic broadcast or specific room logic.
        const eventName = 'notification'
        switch (payload.targetAudience) {
          case notification_interface_1.TARGET_AUDIENCE.ALL_USER:
            // Broadcast to everyone
            server_1.io.emit(eventName, {
              type: 'BROADCAST_NOTIFICATION',
              data: notification,
            })
            break
          case notification_interface_1.TARGET_AUDIENCE.ACTIVE_USER:
            // This would require users to join an 'active' room on connection
            server_1.io.to('active_users').emit(eventName, {
              type: 'BROADCAST_NOTIFICATION',
              data: notification,
            })
            break
          case notification_interface_1.TARGET_AUDIENCE.ORGANIZER:
            server_1.io.to('organizers').emit(eventName, {
              type: 'BROADCAST_NOTIFICATION',
              data: notification,
            })
            break
          default:
            server_1.io.emit(eventName, {
              type: 'BROADCAST_NOTIFICATION',
              data: notification,
            })
        }
      }
    }
    // Note: Email delivery for 10k users would still need batching in the background scheduler
    // For now, we set the status to SENT for the broadcast record.
    console.log(
      `Broadcast notification created for audience: ${payload.targetAudience}`,
    )
    return { success: true }
  } catch (error) {
    throw new ApiError_1.default(
      http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to send manual notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}
exports.NotificationServices = {
  createNotification,
  sendNotificationEmail,
  getAllNotifications,
  getNotificationById,
  updateNotification,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getNotificationStats,
  getMyNotifications,
  sendTestEmail,
  sendManualNotification,
}
