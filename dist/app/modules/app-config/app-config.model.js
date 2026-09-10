"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfig = void 0;
const mongoose_1 = require("mongoose");
const BannerSchema = new mongoose_1.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    actionUrl: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
}, { _id: false });
const AppConfigSchema = new mongoose_1.Schema({
    banners: { type: [BannerSchema], default: [] },
    maintenanceMode: {
        isEnabled: { type: Boolean, default: false },
        message: { type: String, default: 'We are currently performing scheduled maintenance. Please check back shortly.' },
        minAppVersion: { type: String, default: '1.0.0' },
    },
    dailyReminder: {
        isEnabled: { type: Boolean, default: true },
        message: { type: String, default: 'Have you recited your Quran verses today?' },
        time: { type: String, default: '09:00' },
    },
    featureFlags: {
        premiumEnabled: { type: Boolean, default: true },
        audioStreamingEnabled: { type: Boolean, default: true },
        aiChatEnabled: { type: Boolean, default: false },
    },
}, { timestamps: true });
exports.AppConfig = (0, mongoose_1.model)('AppConfig', AppConfigSchema);
