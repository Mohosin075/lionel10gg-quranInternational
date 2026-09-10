"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const app_config_service_1 = require("./app-config.service");
const getAppConfig = (0, catchAsync_1.default)(async (req, res) => {
    const result = await app_config_service_1.AppConfigService.getAppConfig();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'App configuration fetched successfully',
        data: result,
    });
});
const updateAppConfig = (0, catchAsync_1.default)(async (req, res) => {
    const result = await app_config_service_1.AppConfigService.updateAppConfig(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'App configuration updated successfully',
        data: result,
    });
});
exports.AppConfigController = {
    getAppConfig,
    updateAppConfig,
};
