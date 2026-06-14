"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nativeIapService = void 0;
const googleapis_1 = require("googleapis");
// @ts-ignore
const node_apple_receipt_verify_1 = __importDefault(require("node-apple-receipt-verify"));
const config_1 = __importDefault(require("../../../config"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
// Initialize Apple Receipt Verifier
node_apple_receipt_verify_1.default.config({
    secret: config_1.default.iap.apple_shared_secret,
    environment: ['production', 'sandbox'], // Check both environments
});
// Initialize Google Play API
const auth = new googleapis_1.google.auth.JWT({
    email: config_1.default.iap.google_play_service_account_email,
    key: config_1.default.iap.google_play_service_account_private_key,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
});
const playDeveloperApi = googleapis_1.google.androidpublisher('v3');
exports.nativeIapService = {
    /**
     * Verify Apple App Store Receipt
     */
    async verifyAppleReceipt(receiptData, expectedProductId) {
        try {
            const products = await node_apple_receipt_verify_1.default.validate({
                receipt: receiptData,
            });
            // Find the specific product in the validated receipt
            const purchasedProduct = products.find((p) => p.productId === expectedProductId);
            if (!purchasedProduct) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Product not found in Apple receipt');
            }
            return {
                isValid: true,
                transactionId: purchasedProduct.transactionId,
                productId: purchasedProduct.productId,
                purchaseDate: new Date(purchasedProduct.purchaseDate),
            };
        }
        catch (error) {
            console.error('Apple receipt verification failed:', error);
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Apple Receipt Verification Failed: ${error.message}`);
        }
    },
    /**
     * Verify Google Play Store Purchase
     * @param purchaseToken The token provided by the client after purchase
     * @param productId The ID of the in-app product
     */
    async verifyGoogleReceipt(purchaseToken, productId) {
        try {
            if (!config_1.default.iap.google_play_package_name) {
                throw new Error('Google Play Package Name not configured');
            }
            await auth.authorize();
            const response = await playDeveloperApi.purchases.products.get({
                auth,
                packageName: config_1.default.iap.google_play_package_name,
                productId: productId,
                token: purchaseToken,
            });
            const purchase = response.data;
            // Purchase state: 0 = Purchased, 1 = Canceled, 2 = Pending
            if (purchase.purchaseState !== 0) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Purchase is not in a valid state');
            }
            return {
                isValid: true,
                transactionId: purchase.orderId,
                productId: productId,
                purchaseDate: purchase.purchaseTimeMillis ? new Date(parseInt(purchase.purchaseTimeMillis)) : new Date(),
            };
        }
        catch (error) {
            console.error('Google Play verification failed:', error);
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `Google Play Verification Failed: ${error.message}`);
        }
    }
};
