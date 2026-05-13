"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrayerTimeServices = void 0;
const axios_1 = __importDefault(require("axios"));
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const prayer_time_model_1 = require("./prayer-time.model");
const BASE_URL = 'https://api.aladhan.com/v1';
const adhanRecitations = [
    {
        id: 'makkah',
        name: 'Makkah',
        location: 'HARAM AL-MAKKI',
        audioUrl: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    },
    {
        id: 'madinah',
        name: 'Madinah',
        location: 'HARAM AL-MADANI',
        audioUrl: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    },
    {
        id: 'al-aqsa',
        name: 'Al-Aqsa',
        location: 'QUDS',
        audioUrl: 'https://www.islamcan.com/audio/adhan/azan10.mp3',
    },
    {
        id: 'egypt',
        name: 'Egypt',
        location: 'AL-AZHAR',
        audioUrl: 'https://www.islamcan.com/audio/adhan/azan4.mp3',
    },
    {
        id: 'turkey',
        name: 'Turkey',
        location: 'BLUE MOSQUE',
        audioUrl: 'https://www.islamcan.com/audio/adhan/azan6.mp3',
    },
];
const getPrayerTimes = async (city, country) => {
    try {
        const response = await axios_1.default.get(`${BASE_URL}/timingsByCity`, {
            params: {
                city,
                country,
                method: 2, // ISNA or other methods can be configured
            },
        });
        const timings = response.data.data.timings;
        return {
            Fajr: timings.Fajr,
            Dhuhr: timings.Dhuhr,
            Asr: timings.Asr,
            Maghrib: timings.Maghrib,
            Isha: timings.Isha,
            date: response.data.data.date.readable,
            timezone: response.data.data.meta.timezone,
        };
    }
    catch (_a) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to fetch prayer times');
    }
};
const getPrayerSettings = async (userId) => {
    if (!userId) {
        return {
            location: { city: 'Dhaka', country: 'Bangladesh' },
            calculationMethod: 'ISNA',
            activePrayers: ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'],
            selectedRecitationId: 'makkah',
        };
    }
    let settings = await prayer_time_model_1.PrayerSettings.findOne({ user: userId });
    if (!settings) {
        settings = await prayer_time_model_1.PrayerSettings.create({ user: userId });
    }
    return settings;
};
const updatePrayerSettings = async (userId, payload) => {
    const result = await prayer_time_model_1.PrayerSettings.findOneAndUpdate({ user: userId }, { $set: payload }, { new: true, upsert: true });
    return result;
};
const getAdhanRecitations = () => {
    return adhanRecitations;
};
exports.PrayerTimeServices = {
    getPrayerTimes,
    getPrayerSettings,
    updatePrayerSettings,
    getAdhanRecitations,
};
