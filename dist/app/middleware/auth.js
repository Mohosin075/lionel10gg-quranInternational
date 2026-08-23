"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tempAuth = void 0;
const http_status_codes_1 = require("http-status-codes");
const config_1 = __importDefault(require("../../config"));
const jwtHelper_1 = require("../../helpers/jwtHelper");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const user_model_1 = require("../modules/user/user.model");
const user_1 = require("../../enum/user");
const isTokenInvalidated = (issuedAt, invalidatedAt) => {
    if (!issuedAt || !invalidatedAt) {
        return false;
    }
    return issuedAt * 1000 < invalidatedAt.getTime();
};
const assertSessionUser = async (authId, issuedAt) => {
    var _a;
    if (!authId) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid token payload');
    }
    const dbUser = await user_model_1.User.findById(authId).select('+authentication');
    if (!dbUser || dbUser.status !== user_1.USER_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Account is not active');
    }
    if (isTokenInvalidated(issuedAt, (_a = dbUser.authentication) === null || _a === void 0 ? void 0 : _a.passwordChangedAt)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Session has been revoked, please login again');
    }
    return dbUser;
};
const auth = (...roles) => async (req, res, next) => {
    var _a, _b;
    try {
        const tokenWithBearer = req.headers.authorization;
        if (!tokenWithBearer) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Token not found!'));
        }
        if (!tokenWithBearer.startsWith('Bearer')) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid token format'));
        }
        const token = tokenWithBearer.split(' ')[1];
        if (!token) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Token missing after Bearer'));
        }
        let verifyUser;
        try {
            verifyUser = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_secret);
        }
        catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Access Token has expired'));
            }
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Invalid Access Token'));
        }
        await assertSessionUser(verifyUser.authId, verifyUser.iat);
        req.user = verifyUser;
        if (roles.length > 0) {
            const userRole = verifyUser.role || ((_a = verifyUser.user) === null || _a === void 0 ? void 0 : _a.role) || ((_b = verifyUser.data) === null || _b === void 0 ? void 0 : _b.role);
            if (!userRole) {
                return next(new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'User role missing in token'));
            }
            if (!roles.includes(userRole)) {
                return next(new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "You don't have permission to access this API"));
            }
        }
        return next();
    }
    catch (error) {
        return next(error);
    }
};
exports.default = auth;
const tempAuth = (...roles) => async (req, res, next) => {
    try {
        const tokenWithBearer = req.headers.authorization;
        if (!tokenWithBearer) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Token not found!'));
        }
        if (!tokenWithBearer.startsWith('Bearer')) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid token format'));
        }
        const token = tokenWithBearer.split(' ')[1];
        if (!token) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Token missing after Bearer'));
        }
        let verifyUser;
        try {
            verifyUser = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.temp_jwt_secret);
        }
        catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                return next(new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Access Token has expired'));
            }
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Invalid Access Token'));
        }
        req.user = verifyUser;
        if (roles.length && !roles.includes(verifyUser.role)) {
            return next(new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "You don't have permission to access this API"));
        }
        return next();
    }
    catch (error) {
        return next(error);
    }
};
exports.tempAuth = tempAuth;
