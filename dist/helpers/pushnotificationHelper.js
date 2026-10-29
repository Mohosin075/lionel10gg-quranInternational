"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToUsers = exports.sendPushNotification = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const config_1 = __importDefault(require("../config"));
const device_registration_1 = require("../app/modules/notification/device-registration");
const user_model_1 = require("../app/modules/user/user.model");
const messaging = () => {
    if (!firebase_admin_1.default.apps.length) {
        if (!config_1.default.firebase_service_account_base64)
            return null;
        try {
            const account = JSON.parse(Buffer.from(config_1.default.firebase_service_account_base64, 'base64').toString('utf8'));
            firebase_admin_1.default.initializeApp({ credential: firebase_admin_1.default.credential.cert(account) });
        }
        catch (_a) {
            return null;
        }
    }
    return firebase_admin_1.default.messaging();
};
const sendPushNotification = async (deviceToken, title, body, data, icon) => {
    const client = messaging();
    if (!client || !deviceToken)
        return false;
    try {
        await client.send({ token: deviceToken, notification: { title, body }, data,
            android: { notification: { channelId: 'general_notifications', ...(icon ? { icon } : {}) } },
        });
        return true;
    }
    catch (_a) {
        return false;
    }
};
exports.sendPushNotification = sendPushNotification;
const sendPushToUsers = async (userIds, title, body) => {
    const client = messaging();
    if (!client)
        return { configured: false, attempted: 0, accepted: 0, failed: 0 };
    const users = await user_model_1.User.find({ _id: { $in: userIds }, 'settings.pushNotification': { $ne: false } }).select('_id deviceToken').lean();
    const devices = await device_registration_1.DeviceRegistration.find({ user: { $in: users.map(user => user._id) } }).lean();
    const tokens = [...new Set([...devices.map(device => device.token), ...users.map(user => user.deviceToken).filter((token) => !!token)])];
    let accepted = 0, failed = 0;
    for (let offset = 0; offset < tokens.length; offset += 500) {
        const batch = tokens.slice(offset, offset + 500);
        try {
            const result = await client.sendEachForMulticast({ tokens: batch, notification: { title, body }, data: { type: 'ADMIN_NOTIFICATION' }, android: { notification: { channelId: 'general_notifications' } } });
            accepted += result.successCount;
            failed += result.failureCount;
            const invalid = result.responses.flatMap((response, i) => { var _a; return ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(((_a = response.error) === null || _a === void 0 ? void 0 : _a.code) || '') ? [batch[i]] : []; });
            if (invalid.length) {
                await device_registration_1.DeviceRegistration.deleteMany({ token: { $in: invalid } });
                await user_model_1.User.updateMany({ deviceToken: { $in: invalid } }, { $unset: { deviceToken: 1 } });
            }
        }
        catch (_a) {
            failed += batch.length;
        }
    }
    return { configured: true, attempted: tokens.length, accepted, failed };
};
exports.sendPushToUsers = sendPushToUsers;
