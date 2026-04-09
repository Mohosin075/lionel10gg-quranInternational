import { Model, Types } from 'mongoose'
import { TARGET_AUDIENCE } from '../../../enum/notification'
export { TARGET_AUDIENCE }

export interface INotification {
  _id: Types.ObjectId
  userId?: Types.ObjectId
  targetAudience?: TARGET_AUDIENCE
  title: string
  content: string
  type: NotificationType
  channel: NotificationChannel
  status: NotificationStatus
  priority: NotificationPriority
  metadata?: Record<string, unknown>
  scheduledAt?: Date
  sentAt?: Date
  readAt?: Date
  actionUrl?: string
  actionText?: string
  actionClickedAt?: Date
  isRead: boolean
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  WELCOME = 'WELCOME',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_VERIFICATION = 'ACCOUNT_VERIFICATION',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  BOTH = 'BOTH',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED',
}

export enum NotificationPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export interface INotificationFilterables {
  searchTerm?: string
  userId?: string
  type?: NotificationType
  channel?: NotificationChannel
  status?: NotificationStatus
  priority?: NotificationPriority
  isRead?: boolean
  isArchived?: boolean
  startDate?: string
  endDate?: string
}

export interface EmailNotificationData {
  to: string | string[]
  subject: string
  template: string
  data: Record<string, unknown>
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer | string
    contentType?: string
  }>
}

export interface CreateNotificationDto {
  userId?: string | Types.ObjectId
  targetAudience?: TARGET_AUDIENCE
  title: string
  content: string
  type: NotificationType
  channel?: NotificationChannel
  priority?: NotificationPriority
  metadata?: Record<string, unknown>
  scheduledAt?: Date
  actionUrl?: string
  actionText?: string
}

export type NotificationModel = Model<INotification, object, object>

export interface INotificationStats {
  total: number
  unread: number
  byType: Record<string, number>
  byChannel: Record<string, number>
  byStatus: Record<string, number>
}

export interface INotificationAnalytics {
  openRate: number // Percentage of notifications that were opened/read
  engagement: number // Percentage of notifications that had user interaction (clicked action URL)
}

export interface INotificationWithAnalytics extends INotification {
  analytics?: INotificationAnalytics
}
