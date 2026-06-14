"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inAppPurchaseService = void 0;
const http_status_codes_1 = require("http-status-codes");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const in_app_purchase_model_1 = require("./in-app-purchase.model");
const in_app_purchase_package_model_1 = require("./in-app-purchase-package.model");
const native_iap_service_1 = require("./native-iap.service");
class InAppPurchaseService {
    async getAvailablePlans() {
        return await in_app_purchase_package_model_1.InAppPurchasePlan.find({ isActive: true }).sort({ priority: 1 });
    }
    async getPlanById(planId) {
        const plan = await in_app_purchase_package_model_1.InAppPurchasePlan.findById(planId);
        if (!plan) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Package not found');
        }
        return plan;
    }
    async verifyPurchase(userId, data) {
        const user = await user_model_1.User.findById(userId);
        if (!user) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
        }
        const plan = await in_app_purchase_package_model_1.InAppPurchasePlan.findById(data.planId);
        if (!plan) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Package not found');
        }
        let verificationResult;
        if (data.platform === 'ios') {
            verificationResult = await native_iap_service_1.nativeIapService.verifyAppleReceipt(data.receiptData, data.productId);
        }
        else if (data.platform === 'android') {
            verificationResult = await native_iap_service_1.nativeIapService.verifyGoogleReceipt(data.receiptData, data.productId);
        }
        else {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid platform');
        }
        if (!verificationResult.isValid) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid receipt');
        }
        // Check if this transaction has already been processed
        const existingPurchase = await in_app_purchase_model_1.InAppPurchase.findOne({
            transactionId: verificationResult.transactionId,
        });
        if (existingPurchase) {
            return existingPurchase; // Return existing to make it idempotent
        }
        // Create the purchase record
        const purchase = await in_app_purchase_model_1.InAppPurchase.create({
            userId: new mongoose_1.Types.ObjectId(userId),
            planId: plan._id,
            platform: data.platform,
            transactionId: verificationResult.transactionId,
            receiptData: data.receiptData,
            status: 'active',
            purchaseDate: verificationResult.purchaseDate,
            // If it's a subscription package instead of one-time, calculate expiry
            expiryDate: plan.interval === 'month'
                ? new Date(verificationResult.purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
                : undefined
        });
        // TODO: Add any business logic here (e.g., adding coins to user account)
        return purchase;
    }
    async getUserPurchases(userId) {
        return await in_app_purchase_model_1.InAppPurchase.find({ userId }).populate('planId').sort({ purchaseDate: -1 });
    }
}
exports.inAppPurchaseService = new InAppPurchaseService();
