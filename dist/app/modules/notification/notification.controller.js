"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const notification_service_1 = require("./notification.service");
const getMyNotifications = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await notification_service_1.NotificationServices.getMyNotifications(user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notifications fetched successfully',
        data: result,
    });
});
const markAsRead = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const result = await notification_service_1.NotificationServices.markAsRead(id, user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notification marked as read',
        data: result,
    });
});
const markAllAsRead = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await notification_service_1.NotificationServices.markAllAsRead(user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'All notifications marked as read',
        data: result,
    });
});
const deleteNotification = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const result = await notification_service_1.NotificationServices.deleteNotification(id, user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notification deleted successfully',
        data: result,
    });
});
exports.NotificationController = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};
