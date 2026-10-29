"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inAppPurchaseService = void 0;
const http_status_codes_1 = require("http-status-codes");
const crypto_1 = require("crypto");
const mongoose_1 = require("mongoose");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const user_model_1 = require("../user/user.model");
const in_app_purchase_model_1 = require("./in-app-purchase.model");
const in_app_purchase_package_model_1 = require("./in-app-purchase-package.model");
const native_iap_service_1 = require("./native-iap.service");
class InAppPurchaseService {
    async getAvailablePlans() {
        return await in_app_purchase_package_model_1.InAppPurchasePlan.find({ isActive: true }).sort({
            priority: 1,
        });
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
        const expectedProductId = data.platform === 'ios' ? plan.appleProductId : plan.googleProductId;
        if (!plan.isActive ||
            !expectedProductId ||
            data.productId !== expectedProductId) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'This store product is not configured for the selected plan');
        }
        if (data.platform === 'ios') {
            verificationResult = await native_iap_service_1.nativeIapService.verifyAppleReceipt(data.receiptData, data.productId);
        }
        else if (data.platform === 'android') {
            verificationResult = await native_iap_service_1.nativeIapService.verifyGoogleReceipt(data.receiptData, data.productId);
        }
        else {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid platform');
        }
        if (!verificationResult.isValid ||
            !verificationResult.transactionId ||
            verificationResult.productId !== expectedProductId) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid receipt');
        }
        // Check if this transaction has already been processed
        const ownershipKey = (0, crypto_1.createHash)('sha256')
            .update(data.platform +
            ':' +
            (verificationResult.originalTransactionId ||
                verificationResult.transactionId))
            .digest('hex');
        const existingPurchase = await in_app_purchase_model_1.InAppPurchase.findOne({
            $or: [
                { transactionId: verificationResult.transactionId },
                { ownershipKey },
            ],
        });
        const expiryDate = verificationResult.expiryDate;
        if (!expiryDate ||
            !Number.isFinite(expiryDate.getTime()) ||
            expiryDate.getTime() <= Date.now()) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'The store subscription has expired or has no verified expiry');
        }
        if (existingPurchase &&
            (existingPurchase.userId.toString() !== userId ||
                existingPurchase.planId.toString() !== plan._id.toString() ||
                existingPurchase.platform !== data.platform)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'This purchase is already associated with another account or plan');
        }
        const activatePremium = async () => {
            await user_model_1.User.findByIdAndUpdate(userId, {
                subscriptionStatus: 'active',
                subscriptionTier: 'premium',
                subscriptionExpiresAt: expiryDate,
            });
        };
        if (existingPurchase) {
            existingPurchase.expiryDate = expiryDate;
            existingPurchase.ownershipKey = ownershipKey;
            existingPurchase.status = 'active';
            await existingPurchase.save();
            await activatePremium();
            return existingPurchase;
        }
        let purchase;
        try {
            purchase = await in_app_purchase_model_1.InAppPurchase.create({
                userId: new mongoose_1.Types.ObjectId(userId),
                planId: plan._id,
                platform: data.platform,
                transactionId: verificationResult.transactionId,
                ownershipKey,
                receiptData: data.receiptData,
                status: 'active',
                purchaseDate: verificationResult.purchaseDate,
                expiryDate,
            });
        }
        catch (error) {
            if (error.code === 11000) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.CONFLICT, 'Purchase has already been processed; restore it from its original account');
            }
            throw error;
        }
        await activatePremium();
        return purchase;
    }
    async getUserPurchases(userId) {
        return await in_app_purchase_model_1.InAppPurchase.find({ userId })
            .populate('planId')
            .sort({ purchaseDate: -1 });
    }
}
exports.inAppPurchaseService = new InAppPurchaseService();
