"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomAuthController = void 0;
const catchAsync_1 = __importDefault(require("../../../../shared/catchAsync"));
const custom_auth_service_1 = require("./custom.auth.service");
const sendResponse_1 = __importDefault(require("../../../../shared/sendResponse"));
const http_status_codes_1 = require("http-status-codes");
const token_service_1 = require("../../token/token.service");
const ApiError_1 = __importDefault(require("../../../../errors/ApiError"));
const customLogin = (0, catchAsync_1.default)(async (req, res) => {
    const { ...loginData } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.customLogin(loginData);
    const { status, message, accessToken, refreshToken, role } = result;
    res.cookie('refreshToken', refreshToken, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: status,
        success: true,
        message: message,
        data: { accessToken, refreshToken, role },
    });
});
const adminLogin = (0, catchAsync_1.default)(async (req, res) => {
    const { ...loginData } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.adminLogin(loginData);
    const { status, message, accessToken, refreshToken, role } = result;
    res.cookie('refreshToken', refreshToken, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: status,
        success: true,
        message: message,
        data: { accessToken, refreshToken, role },
    });
});
const forgetPassword = (0, catchAsync_1.default)(async (req, res) => {
    const { email, phone } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.forgetPassword(email ? email.toLowerCase().trim() : undefined, phone);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: result,
        data: result,
    });
});
const resetPassword = (0, catchAsync_1.default)(async (req, res) => {
    const token = req.headers.authorization;
    const { ...resetData } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.resetPassword(token, resetData);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Password reset successfully, please login now.',
        data: result,
    });
});
const verifyAccount = (0, catchAsync_1.default)(async (req, res) => {
    const { oneTimeCode, email } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.verifyAccount(email, oneTimeCode);
    const { status, message, accessToken, refreshToken, role, token } = result;
    res.cookie('refreshToken', refreshToken, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: status,
        success: true,
        message: message,
        data: { accessToken, refreshToken, role, token },
    });
});
const getRefreshToken = (0, catchAsync_1.default)(async (req, res) => {
    var _a, _b;
    const refreshToken = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.refreshToken) || ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.refreshToken);
    if (!refreshToken) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Refresh token is required');
    }
    const result = await custom_auth_service_1.CustomAuthServices.getRefreshToken(refreshToken);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Token refreshed successfully',
        data: result,
    });
});
const resendOtp = (0, catchAsync_1.default)(async (req, res) => {
    const { email, phone, authType } = req.body;
    await custom_auth_service_1.CustomAuthServices.resendOtp(email, authType);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'If an account exists, an OTP has been sent.',
    });
});
const changePassword = (0, catchAsync_1.default)(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.changePassword(req.user, currentPassword, newPassword);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Password changed successfully',
        data: result,
    });
});
const createUser = (0, catchAsync_1.default)(async (req, res) => {
    const { ...userData } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.createUser(userData);
    res.cookie('email', result.data.email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60 * 1000,
        sameSite: 'strict',
    });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: result.success,
        message: result.message,
        data: result.data,
    });
});
const deleteAccount = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const { password } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.deleteAccount(user, password);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Account deleted successfully',
        data: result,
    });
});
const socialLogin = (0, catchAsync_1.default)(async (req, res) => {
    const { provider, idToken, deviceToken } = req.body;
    const result = await custom_auth_service_1.CustomAuthServices.socialLogin(provider, idToken, deviceToken);
    const { status, message, accessToken, refreshToken, role } = result;
    res.cookie('refreshToken', refreshToken, {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
    });
    (0, sendResponse_1.default)(res, {
        statusCode: status,
        success: true,
        message: message,
        data: { accessToken, refreshToken, role },
    });
});
const logout = (0, catchAsync_1.default)(async (req, res) => {
    const userId = req.user.authId;
    const result = await token_service_1.TokenServices.logout(userId);
    res.clearCookie('refreshToken');
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Logged out successfully',
        data: result,
    });
});
exports.CustomAuthController = {
    forgetPassword,
    resetPassword,
    verifyAccount,
    customLogin,
    getRefreshToken,
    resendOtp,
    changePassword,
    createUser,
    deleteAccount,
    adminLogin,
    socialLogin,
    logout,
};
