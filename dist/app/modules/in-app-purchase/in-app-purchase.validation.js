"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inAppPurchaseValidation = void 0;
const zod_1 = require("zod");
const verifyPurchase = zod_1.z.object({
    body: zod_1.z.object({
        planId: zod_1.z.string({
            required_error: 'Plan ID is required',
        }),
        platform: zod_1.z.enum(['ios', 'android'], {
            required_error: 'Platform is required',
        }),
        receiptData: zod_1.z.string({
            required_error: 'Receipt data is required',
        }),
        productId: zod_1.z.string({
            required_error: 'Product ID is required',
        }),
    }),
});
exports.inAppPurchaseValidation = {
    verifyPurchase,
};
