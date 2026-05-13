"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrayerSettings = void 0;
const mongoose_1 = require("mongoose");
const prayerSettingsSchema = new mongoose_1.Schema({
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    location: {
        city: { type: String, required: true, default: 'Dhaka' },
        country: { type: String, required: true, default: 'Bangladesh' },
        coordinates: {
            latitude: { type: Number },
            longitude: { type: Number },
        },
    },
    activePrayers: {
        type: [String],
        enum: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
        default: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
    },
    selectedRecitationId: {
        type: String,
        default: 'makkah',
    },
}, {
    timestamps: true,
});
exports.PrayerSettings = (0, mongoose_1.model)('PrayerSettings', prayerSettingsSchema);
