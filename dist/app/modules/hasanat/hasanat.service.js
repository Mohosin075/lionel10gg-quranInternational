"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HasanatService = void 0;
const user_model_1 = require("../user/user.model");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const http_status_codes_1 = require("http-status-codes");
const collectHasanat = async (userId, amount) => {
    const hasanatAmount = Number(amount);
    if (!Number.isSafeInteger(hasanatAmount) ||
        hasanatAmount <= 0 ||
        hasanatAmount > 10000000) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid amount');
    }
    const user = await user_model_1.User.findByIdAndUpdate(userId, { $inc: { totalHasanat: hasanatAmount } }, { new: true });
    if (!user)
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    return user;
};
exports.HasanatService = {
    collectHasanat,
};
