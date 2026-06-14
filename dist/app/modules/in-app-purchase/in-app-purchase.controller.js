"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppPurchaseController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const in_app_purchase_service_1 = require("./in-app-purchase.service");
const getAvailablePlans = (0, catchAsync_1.default)(async (req, res) => {
    const plans = await in_app_purchase_service_1.inAppPurchaseService.getAvailablePlans();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'InAppPurchase plans retrieved successfully',
        data: plans,
    });
});
const getPlanById = (0, catchAsync_1.default)(async (req, res) => {
    const { planId } = req.params;
    const plan = await in_app_purchase_service_1.inAppPurchaseService.getPlanById(planId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'InAppPurchase plan retrieved successfully',
        data: plan,
    });
});
const verifyPurchase = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const userId = user.authId.toString();
    const purchase = await in_app_purchase_service_1.inAppPurchaseService.verifyPurchase(userId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Purchase verified successfully',
        data: purchase,
    });
});
const getUserPurchases = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const userId = user.authId.toString();
    const purchases = await in_app_purchase_service_1.inAppPurchaseService.getUserPurchases(userId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Purchases retrieved successfully',
        data: purchases,
    });
});
exports.InAppPurchaseController = {
    getAvailablePlans,
    getPlanById,
    verifyPurchase,
    getUserPurchases
};
