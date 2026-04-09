'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.NotificationController = void 0
const http_status_codes_1 = require('http-status-codes')
const notification_service_1 = require('./notification.service')
const catchAsync_1 = __importDefault(require('../../../shared/catchAsync'))
const sendResponse_1 = __importDefault(require('../../../shared/sendResponse'))
const pick_1 = __importDefault(require('../../../shared/pick'))
const notification_constant_1 = require('./notification.constant')
const pagination_1 = require('../../../interfaces/pagination')
const createNotification = (0, catchAsync_1.default)(async (req, res) => {
  const result =
    await notification_service_1.NotificationServices.createNotification(
      req.body,
    )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.CREATED,
    success: true,
    message: 'Notification created successfully',
    data: result,
  })
})
const getAllNotifications = (0, catchAsync_1.default)(async (req, res) => {
  const user = req.user
  const filters = (0, pick_1.default)(
    req.query,
    notification_constant_1.notificationFilterableFields,
  )
  const paginationOptions = (0, pick_1.default)(
    req.query,
    pagination_1.paginationFields,
  )
  const result =
    await notification_service_1.NotificationServices.getAllNotifications(
      user,
      filters,
      paginationOptions,
    )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})
const getMyNotifications = (0, catchAsync_1.default)(async (req, res) => {
  const user = req.user
  const paginationOptions = (0, pick_1.default)(
    req.query,
    pagination_1.paginationFields,
  )
  const result =
    await notification_service_1.NotificationServices.getMyNotifications(
      user,
      paginationOptions,
    )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'My notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  })
})
const getNotificationById = (0, catchAsync_1.default)(async (req, res) => {
  const { id } = req.params
  const result =
    await notification_service_1.NotificationServices.getNotificationById(id)
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Notification retrieved successfully',
    data: result,
  })
})
const updateNotification = (0, catchAsync_1.default)(async (req, res) => {
  const { id } = req.params
  const user = req.user
  const result =
    await notification_service_1.NotificationServices.updateNotification(
      id,
      req.body,
      user.role === 'user' ? user.authId : undefined,
    )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Notification updated successfully',
    data: result,
  })
})
const markAsRead = (0, catchAsync_1.default)(async (req, res) => {
  const { id } = req.params
  const user = req.user
  const result = await notification_service_1.NotificationServices.markAsRead(
    id,
    user.authId,
  )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  })
})
const markAllAsRead = (0, catchAsync_1.default)(async (req, res) => {
  const user = req.user
  console.log({ user })
  const result =
    await notification_service_1.NotificationServices.markAllAsRead(user.authId)
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'All notifications marked as read',
    data: result,
  })
})
const archiveNotification = (0, catchAsync_1.default)(async (req, res) => {
  const { id } = req.params
  const user = req.user
  const result =
    await notification_service_1.NotificationServices.archiveNotification(
      id,
      user.authId,
    )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Notification archived',
    data: result,
  })
})
const deleteNotification = (0, catchAsync_1.default)(async (req, res) => {
  const { id } = req.params
  const result =
    await notification_service_1.NotificationServices.deleteNotification(id)
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Notification deleted successfully',
    data: result,
  })
})
const getNotificationStats = (0, catchAsync_1.default)(async (req, res) => {
  const user = req.user
  const result =
    await notification_service_1.NotificationServices.getNotificationStats(user)
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Notification statistics retrieved',
    data: result,
  })
})
const sendTestEmail = (0, catchAsync_1.default)(async (req, res) => {
  const { to, template } = req.body
  const result =
    await notification_service_1.NotificationServices.sendTestEmail(
      to,
      template,
    )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Test email sent successfully',
    data: result,
  })
})
const sendManualNotification = (0, catchAsync_1.default)(async (req, res) => {
  const result =
    await notification_service_1.NotificationServices.sendManualNotification(
      req.body,
    )
  ;(0, sendResponse_1.default)(res, {
    statusCode: http_status_codes_1.StatusCodes.OK,
    success: true,
    message: 'Manual notifications sent successfully',
    data: result,
  })
})
exports.NotificationController = {
  createNotification,
  getAllNotifications,
  getMyNotifications,
  getNotificationById,
  updateNotification,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  getNotificationStats,
  sendTestEmail,
  sendManualNotification,
}
