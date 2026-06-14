"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPremium = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const user_model_1 = require("../modules/user/user.model");
const user_1 = require("../../enum/user");
const checkPremium = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Unauthorized access!'));
        }
        const userRole = user.role;
        // Admins and Super Admins bypass subscription checks
        if (userRole === user_1.USER_ROLES.SUPER_ADMIN || userRole === user_1.USER_ROLES.ADMIN) {
            return next();
        }
        // Fetch user from DB to verify current subscription state
        const userId = user.authId;
        if (!userId) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid token payload'));
        }
        const dbUser = await user_model_1.User.findById(userId);
        if (!dbUser) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found!'));
        }
        const isSubscriptionActive = dbUser.subscriptionStatus === 'active' &&
            dbUser.subscriptionExpiresAt &&
            new Date(dbUser.subscriptionExpiresAt) > new Date();
        if (!isSubscriptionActive) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.PAYMENT_REQUIRED, 'Premium subscription required to access this feature'));
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkPremium = checkPremium;
