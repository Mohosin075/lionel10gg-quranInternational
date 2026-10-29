"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unregisterDevice = exports.registerDevice = exports.DeviceRegistration = void 0;
const mongoose_1 = require("mongoose");
const zod_1 = require("zod");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const user_model_1 = require("../user/user.model");
exports.DeviceRegistration = (0, mongoose_1.model)('DeviceRegistration', new mongoose_1.Schema({
    token: { type: String, required: true, unique: true },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
}, { timestamps: true }));
const tokenSchema = zod_1.z.object({ token: zod_1.z.string().min(20).max(4096) });
exports.registerDevice = (0, catchAsync_1.default)(async (req, res) => {
    const { token } = tokenSchema.parse(req.body);
    const user = req.user.authId;
    await user_model_1.User.updateMany({ deviceToken: token }, { $unset: { deviceToken: 1 } });
    await exports.DeviceRegistration.findOneAndUpdate({ token }, { user }, { upsert: true, new: true });
    res.json({ success: true, data: { registered: true } });
});
exports.unregisterDevice = (0, catchAsync_1.default)(async (req, res) => {
    const { token } = tokenSchema.parse(req.body);
    const user = req.user.authId;
    await exports.DeviceRegistration.deleteOne({ token, user });
    await user_model_1.User.updateOne({ _id: user, deviceToken: token }, { $unset: { deviceToken: 1 } });
    res.json({ success: true, data: { registered: false } });
});
