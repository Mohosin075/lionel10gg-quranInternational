"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationServices = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const notification_model_1 = require("./notification.model");
const server_1 = require("../../../server");
const createNotification = async (payload) => {
    const result = await notification_model_1.Notification.create(payload);
    // Send real-time notification via socket
    if (server_1.io && result.userId) {
        server_1.io.to(result.userId.toString()).emit('notification', {
            type: 'NEW_NOTIFICATION',
            data: result,
        });
    }
    return result;
};
const getMyNotifications = async (userId) => {
    const result = await notification_model_1.Notification.find({ userId }).sort({ createdAt: -1 });
    return result;
};
const markAsRead = async (id, userId) => {
    const result = await notification_model_1.Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
    return result;
};
const markAllAsRead = async (userId) => {
    const result = await notification_model_1.Notification.updateMany({ userId, isRead: false }, { isRead: true });
    return result;
};
const deleteNotification = async (id, userId) => {
    const result = await notification_model_1.Notification.findOneAndDelete({ _id: id, userId });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Notification not found');
    }
    return result;
};
exports.NotificationServices = {
    createNotification,
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
};
