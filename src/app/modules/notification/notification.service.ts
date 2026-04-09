import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import {
  INotification,
  INotificationFilterables,
  CreateNotificationDto,
  NotificationType,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  INotificationStats,
  INotificationAnalytics,
  TARGET_AUDIENCE,
} from './notification.interface'
import { Notification } from './notification.model'
import { JwtPayload } from 'jsonwebtoken'
import { IPaginationOptions } from '../../../interfaces/pagination'
import { paginationHelper } from '../../../helpers/paginationHelper'
import { notificationSearchableFields } from './notification.constant'
import { Types } from 'mongoose'
import { emailProvider } from './notification.providers'
import { User } from '../user/user.model'
import config from '../../../config'
import { io } from '../../../server'

const createNotification = async (
  payload: CreateNotificationDto,
  sendEmail: boolean = false,
): Promise<INotification> => {
  try {
    const notificationData: Partial<INotification> = {
      userId: payload.userId as Types.ObjectId,
      title: payload.title,
      content: payload.content,
      type: payload.type,
      channel: payload.channel || NotificationChannel.IN_APP,
      priority: payload.priority,
      metadata: payload.metadata || {},
      actionUrl: payload.actionUrl,
      actionText: payload.actionText,
    }

    if (payload.scheduledAt) {
      notificationData.scheduledAt = payload.scheduledAt
      notificationData.status = NotificationStatus.PENDING
    }

    const notification = await Notification.create(notificationData)

    // Send real-time notification via socket
    if (
      notification.channel !== NotificationChannel.EMAIL &&
      notification.userId
    ) {
      // Emit socket event for real-time notification
      if (io) {
        io.to(notification.userId.toString()).emit('notification', {
          type: 'NEW_NOTIFICATION',
          data: notification,
        })
      }
    }

    // Send email if requested
    if (sendEmail && notification.channel !== NotificationChannel.IN_APP) {
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
  } catch (error: unknown) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to create notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

const sendNotificationEmail = async (
  notification: INotification,
): Promise<void> => {
  try {
    const user = await User.findById(notification.userId)
    if (!user || !user.email) {
      throw new Error('User not found or no email available')
    }

    let template: string = 'system-alert'
    const templateData: Record<string, unknown> = {
      userName: user.name,
      notificationTitle: notification.title,
      notificationContent: notification.content,
      actionUrl: notification.actionUrl,
      actionText: notification.actionText,
    }

    // Map notification type to template and add specific data
    switch (notification.type) {
      case NotificationType.WELCOME:
        template = 'welcome'
        break

      case NotificationType.PASSWORD_RESET:
        template = 'password-reset'
        if (notification.metadata?.resetCode) {
          templateData.resetCode = notification.metadata.resetCode
          templateData.expiryMinutes = 30
        }
        break

      case NotificationType.ACCOUNT_VERIFICATION:
        template = 'account-verification'
        if (notification.metadata?.verificationToken) {
          templateData.verificationUrl = `${config.clientUrl}/verify-email?token=${notification.metadata.verificationToken}`
        }
        break

      default:
        template = 'system-alert'
    }

    await emailProvider.sendTemplateEmail(
      user.email,
      template,
      templateData,
      notification.title,
    )

    // Update notification status
    await Notification.findByIdAndUpdate(notification._id, {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    })
  } catch (error: unknown) {
    console.error('Failed to send notification email:', error)

    // Update notification status to failed
    await Notification.findByIdAndUpdate(notification._id, {
      status: NotificationStatus.FAILED,
      metadata: {
        ...notification.metadata,
        emailError: error instanceof Error ? error.message : 'Unknown error',
      },
    })

    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to send email notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

const getAllNotifications = async (
  user: JwtPayload,
  filterables: INotificationFilterables,
  pagination: IPaginationOptions,
) => {
  const { searchTerm, ...filterData } = filterables
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper.calculatePagination(pagination)

  const andConditions: Record<string, unknown>[] = []

  // Search term
  if (searchTerm) {
    andConditions.push({
      $or: notificationSearchableFields.map(field => ({
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
          const dateCondition: Record<string, Date> = {}
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
        { userId: new Types.ObjectId(user.authId as string) },
        { targetAudience: TARGET_AUDIENCE.ALL_USER },
        { targetAudience: TARGET_AUDIENCE.ACTIVE_USER },
      ],
    })
  } else if (user.role === 'organizer') {
    andConditions.push({
      $or: [
        { userId: new Types.ObjectId(user.authId as string) },
        { targetAudience: TARGET_AUDIENCE.ALL_USER },
        { targetAudience: TARGET_AUDIENCE.ACTIVE_USER },
        { targetAudience: TARGET_AUDIENCE.ORGANIZER },
      ],
    })
  }

  const whereConditions = andConditions.length ? { $and: andConditions } : {}

  const [result, total, analyticsData] = await Promise.all([
    Notification.find(whereConditions)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .populate('userId', 'name email')
      .lean(),
    Notification.countDocuments(whereConditions as Record<string, unknown>),
    // Get overall analytics for the filtered notifications
    Notification.aggregate([
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
    ]) as unknown as Array<{
      totalNotifications: number
      readNotifications: number
      clickedNotifications: number
    }>,
  ])

  const stats = analyticsData[0] || {
    totalNotifications: 0,
    readNotifications: 0,
    clickedNotifications: 0,
  }

  const overallAnalytics: INotificationAnalytics = {
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
      engagement: (notification as INotification).actionClickedAt ? 100 : 0, // Individual notification action is either clicked (100%) or not (0%)
    } as INotificationAnalytics,
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

const getNotificationById = async (id: string): Promise<INotification> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid notification ID')
  }

  const result = await Notification.findById(id)
    .populate('userId', 'name email')
    .lean()

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
  }

  return result
}

const updateNotification = async (
  id: string,
  payload: Partial<INotification>,
  userId?: string,
): Promise<INotification> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid notification ID')
  }

  const query: Record<string, unknown> = { _id: id }
  if (userId) {
    query.userId = userId
  }

  const result = await Notification.findOneAndUpdate(
    query,
    { $set: payload },
    { new: true, runValidators: true },
  )
    .populate('userId', 'name email')
    .lean()

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
  }

  return result as unknown as INotification
}

const markAsRead = async (
  id: string,
  userId: string,
): Promise<INotification> => {
  const result = await Notification.findOneAndUpdate(
    { _id: id, userId },
    {
      isRead: true,
      readAt: new Date(),
      status: NotificationStatus.READ,
    },
    { new: true },
  )
    .populate('userId', 'name email')
    .lean()

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
  }

  return result as unknown as INotification
}

const markAllAsRead = async (
  userId: string,
): Promise<{ modifiedCount: number }> => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    {
      isRead: true,
      readAt: new Date(),
      status: NotificationStatus.READ,
    },
  )

  return { modifiedCount: result.modifiedCount }
}

const archiveNotification = async (
  id: string,
  userId: string,
): Promise<INotification> => {
  const result = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { isArchived: true },
    { new: true },
  )
    .populate('userId', 'name email')
    .lean()

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
  }

  return result as unknown as INotification
}

const deleteNotification = async (id: string): Promise<INotification> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid notification ID')
  }

  const result = await Notification.findByIdAndDelete(id).lean()

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found')
  }

  return result as unknown as INotification
}

const getNotificationStats = async (
  user: JwtPayload & { authId?: string; role?: string },
): Promise<INotificationStats> => {
  const query: Record<string, unknown> = {}

  if (user.role === 'user') {
    query.$or = [
      { userId: user.authId },
      { targetAudience: TARGET_AUDIENCE.ALL_USER },
    ]
  } else if (user.role === 'organizer') {
    query.$or = [
      { userId: user.authId },
      { targetAudience: TARGET_AUDIENCE.ALL_USER },
      { targetAudience: TARGET_AUDIENCE.ORGANIZER },
    ]
  }

  const [total, unread, byType, byChannel, byStatus] = await Promise.all([
    Notification.countDocuments(query),
    Notification.countDocuments({ ...query, isRead: false }),
    Notification.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]),
    Notification.aggregate([
      { $match: query },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
    ]),
    Notification.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ])

  const stats: INotificationStats = {
    total,
    unread,
    byType: {},
    byChannel: {},
    byStatus: {},
  }

  byType.forEach((item: { _id: string; count: number }) => {
    stats.byType[item._id] = item.count
  })

  byChannel.forEach((item: { _id: string; count: number }) => {
    stats.byChannel[item._id] = item.count
  })

  byStatus.forEach((item: { _id: string; count: number }) => {
    stats.byStatus[item._id] = item.count
  })

  return stats
}

const getMyNotifications = async (
  user: JwtPayload & { authId: string; role?: string },
  pagination: IPaginationOptions,
) => {
  const { page, skip, limit, sortBy, sortOrder } =
    paginationHelper.calculatePagination(pagination)

  const query: Record<string, unknown> = {
    $or: [
      { userId: new Types.ObjectId(user.authId) },
      { targetAudience: TARGET_AUDIENCE.ALL_USER },
    ],
    isArchived: false,
  }

  // Add role-specific broadcast logic
  if (user.role === 'organizer') {
    ;(query.$or as Record<string, unknown>[]).push({
      targetAudience: TARGET_AUDIENCE.ORGANIZER,
    })
  }

  // Active status logic (assuming active users have specific status in JWT or we fetch it)
  // For now, including active user broadcasts for everyone since they are 'active' if logged in
  ;(query.$or as Record<string, unknown>[]).push({
    targetAudience: TARGET_AUDIENCE.ACTIVE_USER,
  })

  const [result, total] = await Promise.all([
    Notification.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ [sortBy]: sortOrder })
      .lean(),
    Notification.countDocuments(query),
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

const sendTestEmail = async (
  to: string,
  template: string,
): Promise<boolean> => {
  try {
    const user = await User.findOne({ email: to })
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found')
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
      verificationUrl: `${config.clientUrl}/verify-email?token=test-token-123`,
      actionUrl: `${config.clientUrl}/dashboard`,
      actionText: 'Go to Dashboard',
    }

    await emailProvider.sendTemplateEmail(to, template, testData)
    return true
  } catch (error: unknown) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to send test email: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

const sendManualNotification = async (
  payload: CreateNotificationDto,
): Promise<{ success: boolean }> => {
  try {
    // Create a single broadcast notification record
    const notificationData = {
      title: payload.title,
      content: payload.content,
      type: payload.type || NotificationType.SYSTEM_ALERT,
      channel: payload.channel || NotificationChannel.IN_APP,
      priority: payload.priority || NotificationPriority.MEDIUM,
      targetAudience: payload.targetAudience || TARGET_AUDIENCE.ACTIVE_USER,
      actionUrl: payload.actionUrl,
      actionText: payload.actionText,
      status: NotificationStatus.SENT, // Broadcasts are usually sent immediately
      sentAt: new Date(),
    }

    const notification = await Notification.create(notificationData)

    // Emit broadcast socket event based on target audience
    if (payload.channel !== NotificationChannel.EMAIL) {
      if (io) {
        // We can emit to specific rooms based on role if needed,
        // but for now, we'll use a generic broadcast or specific room logic.

        const eventName = 'notification'

        switch (payload.targetAudience) {
          case TARGET_AUDIENCE.ALL_USER:
            // Broadcast to everyone
            io.emit(eventName, {
              type: 'BROADCAST_NOTIFICATION',
              data: notification,
            })
            break
          case TARGET_AUDIENCE.ACTIVE_USER:
            // This would require users to join an 'active' room on connection
            io.to('active_users').emit(eventName, {
              type: 'BROADCAST_NOTIFICATION',
              data: notification,
            })
            break
          case TARGET_AUDIENCE.ORGANIZER:
            io.to('organizers').emit(eventName, {
              type: 'BROADCAST_NOTIFICATION',
              data: notification,
            })
            break
          default:
            io.emit(eventName, {
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
  } catch (error: unknown) {
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      `Failed to send manual notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }
}

export const NotificationServices = {
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
