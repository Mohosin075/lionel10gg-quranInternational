"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrayerTimeControllers = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const prayer_time_service_1 = require("./prayer-time.service");
const getMyPrayerTimes = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const authId = user === null || user === void 0 ? void 0 : user.authId;
    const settings = await prayer_time_service_1.PrayerTimeServices.getPrayerSettings(authId);
    const prayerTimes = await prayer_time_service_1.PrayerTimeServices.getPrayerTimes(settings.location.city, settings.location.country);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Prayer times fetched successfully',
        data: {
            timings: prayerTimes,
            settings,
        },
    });
});
const getAdhanRecitations = (0, catchAsync_1.default)(async (req, res) => {
    const result = prayer_time_service_1.PrayerTimeServices.getAdhanRecitations();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Adhan recitations fetched successfully',
        data: result,
    });
});
const updateSettings = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await prayer_time_service_1.PrayerTimeServices.updatePrayerSettings(user.authId, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Prayer settings updated successfully',
        data: result,
    });
});
exports.PrayerTimeControllers = {
    getMyPrayerTimes,
    getAdhanRecitations,
    updateSettings,
};
