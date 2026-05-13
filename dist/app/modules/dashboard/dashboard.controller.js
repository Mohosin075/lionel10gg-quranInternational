"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const dashboard_service_1 = require("./dashboard.service");
const getAnalytics = (0, catchAsync_1.default)(async (req, res) => {
    const result = await dashboard_service_1.DashboardService.getAnalytics();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Analytics data retrieved successfully',
        data: result,
    });
});
const getUserManagement = (0, catchAsync_1.default)(async (req, res) => {
    const result = await dashboard_service_1.DashboardService.getUserManagement();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'User management data retrieved successfully',
        data: result,
    });
});
const getNotificationManagement = (0, catchAsync_1.default)(async (req, res) => {
    const result = await dashboard_service_1.DashboardService.getNotificationManagement();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Notification management data retrieved successfully',
        data: result,
    });
});
const getReports = (0, catchAsync_1.default)(async (req, res) => {
    const result = await dashboard_service_1.DashboardService.getReports();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Reports data retrieved successfully',
        data: result,
    });
});
exports.DashboardController = {
    getAnalytics,
    getUserManagement,
    getNotificationManagement,
    getReports,
};
