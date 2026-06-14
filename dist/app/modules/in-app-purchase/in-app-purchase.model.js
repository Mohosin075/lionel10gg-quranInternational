"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InAppPurchase = void 0;
const mongoose_1 = require("mongoose");
const inAppPurchaseSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    planId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'InAppPurchasePlan',
        required: true,
    },
    platform: {
        type: String,
        enum: ['ios', 'android', 'web'],
        required: true,
    },
    transactionId: {
        type: String,
        required: true,
        unique: true,
    },
    originalTransactionId: {
        type: String,
    },
    receiptData: {
        type: String,
    },
    status: {
        type: String,
        enum: [
            'active',
            'expired',
            'canceled',
            'pending'
        ],
        default: 'active',
    },
    purchaseDate: {
        type: Date,
        required: true,
    },
    expiryDate: {
        type: Date,
    },
    canceledAt: {
        type: Date,
        default: null,
    },
    metadata: {
        type: Map,
        of: String,
        default: {},
    },
}, {
    timestamps: true,
});
// Indexes for efficient queries
inAppPurchaseSchema.index({ userId: 1 });
inAppPurchaseSchema.index({ transactionId: 1 });
inAppPurchaseSchema.index({ status: 1 });
// Compound indexes
inAppPurchaseSchema.index({ userId: 1, status: 1 });
// Static methods
inAppPurchaseSchema.statics.findActiveByUserId = function (userId) {
    return this.findOne({
        userId,
        status: { $in: ['active'] },
    }).populate('planId');
};
inAppPurchaseSchema.statics.findByTransactionId = function (transactionId) {
    return this.findOne({ transactionId }).populate(['userId', 'planId']);
};
exports.InAppPurchase = (0, mongoose_1.model)('InAppPurchase', inAppPurchaseSchema);
