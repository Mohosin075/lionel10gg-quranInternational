"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastReadController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const lastRead_service_1 = require("./lastRead.service");
const updateLastRead = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await lastRead_service_1.LastReadServices.updateLastRead({ ...req.body, user: user.authId });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Last read updated successfully',
        data: result,
    });
});
const getLastRead = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await lastRead_service_1.LastReadServices.getLastRead(user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Last read fetched successfully',
        data: result,
    });
});
exports.LastReadController = {
    updateLastRead,
    getLastRead,
};
