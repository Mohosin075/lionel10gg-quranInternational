"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const pushnotificationHelper_1 = require("../../../helpers/pushnotificationHelper");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const zod_1 = require("zod");
const mongoose_1 = require("mongoose");
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const notification_service_1 = require("./notification.service");
const user_model_1 = require("../user/user.model");
const notification_model_1 = require("./notification.model");
const server_1 = require("../../../server");
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
const sendAdminNotification = (0, catchAsync_1.default)(async (req, res) => {
    const { title, message, userId } = zod_1.z.object({ title: zod_1.z.string().trim().min(1).max(200), message: zod_1.z.string().trim().min(1).max(4000), userId: zod_1.z.string().regex(/^[a-fA-F0-9]{24}$/).optional() }).parse(req.body);
    const recipients = await user_model_1.User.find({ status: 'active', ...(userId ? { _id: userId } : {}) }).select('_id');
    if (userId && recipients.length === 0)
        throw new ApiError_1.default(404, 'Active user not found');
    let result;
    if (userId) {
        result = await notification_service_1.NotificationServices.createNotification({ userId: new mongoose_1.Types.ObjectId(userId), title, message });
    }
    else {
        // Broadcast to all users
        const users = recipients;
        const notifications = users.map(user => ({
            userId: user._id,
            title,
            message,
        }));
        result = await notification_model_1.Notification.insertMany(notifications);
        if (server_1.io) {
            server_1.io.emit('notification', {
                type: 'NEW_NOTIFICATION',
                data: { title, message },
            });
        }
    }
    const push = await (0, pushnotificationHelper_1.sendPushToUsers)(recipients.map(user => user._id.toString()), title, message);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notification stored; push dispatch status is included',
        data: { recorded: Array.isArray(result) ? result.length : 1, push },
    });
});
exports.NotificationController = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendAdminNotification,
};
