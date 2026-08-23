"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketMiddleware = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../errors/ApiError"));
const jwtHelper_1 = require("../../helpers/jwtHelper");
const colors_1 = __importDefault(require("colors"));
const config_1 = __importDefault(require("../../config"));
const zod_1 = require("zod");
const handleZodError_1 = __importDefault(require("../../errors/handleZodError"));
const user_model_1 = require("../modules/user/user.model");
const user_1 = require("../../enum/user");
const socketAuth = (...roles) => {
    return async (socket, next) => {
        var _a;
        try {
            const token = socket.handshake.auth.token ||
                socket.handshake.query.token ||
                socket.handshake.headers.authorization;
            if (!token) {
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Authentication token is required to access this resource');
            }
            try {
                const jwtToken = extractToken(token);
                const verifiedUser = jwtHelper_1.jwtHelper.verifyToken(jwtToken, config_1.default.jwt.jwt_secret);
                const dbUser = await user_model_1.User.findById(verifiedUser.authId).select('+authentication');
                if (!dbUser || dbUser.status !== user_1.USER_STATUS.ACTIVE) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Account is not active');
                }
                if (verifiedUser.iat &&
                    ((_a = dbUser.authentication) === null || _a === void 0 ? void 0 : _a.passwordChangedAt) &&
                    verifiedUser.iat * 1000 <
                        dbUser.authentication.passwordChangedAt.getTime()) {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Session has been revoked, please login again');
                }
                socket.user = {
                    authId: verifiedUser.authId,
                    name: verifiedUser.name,
                    email: verifiedUser.email,
                    role: verifiedUser.role,
                    ...verifiedUser,
                };
                if (roles.length && !roles.includes(verifiedUser.role)) {
                    return next(new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, "You don't have permission to access this socket event"));
                }
                next();
            }
            catch (error) {
                if (error instanceof ApiError_1.default) {
                    throw error;
                }
                if (error instanceof Error && error.name === 'TokenExpiredError') {
                    throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Access Token has expired');
                }
                throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Invalid Access Token');
            }
        }
        catch (error) {
            if (error instanceof ApiError_1.default) {
                const apiError = error;
                const errorResponse = {
                    statusCode: apiError.statusCode,
                    error: getErrorName(apiError.statusCode),
                    message: apiError.message,
                };
                socket.emit('socket_error', errorResponse);
            }
            next(error);
        }
    };
};
const handleSocketRequest = (socket, ...roles) => {
    try {
        const token = socket.handshake.auth.token ||
            socket.handshake.query.token ||
            socket.handshake.headers.authorization;
        const jwtToken = extractToken(token);
        // Verify token
        const verifiedUser = jwtHelper_1.jwtHelper.verifyToken(jwtToken, config_1.default.jwt.jwt_secret);
        // Guard user based on roles
        if (roles.length && !roles.includes(verifiedUser.role)) {
            socket.emit('socket_error', createErrorResponse(http_status_codes_1.StatusCodes.FORBIDDEN, "You don't have permission to access this socket event"));
            return null;
        }
        return {
            ...verifiedUser,
        };
    }
    catch (error) {
        handleSocketError(socket, error);
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Access Token has expired');
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Invalid Access Token');
    }
};
function createErrorResponse(statusCode, message, errorMessages) {
    return {
        statusCode,
        error: getErrorName(statusCode),
        message,
        ...(errorMessages && { errorMessages }),
    };
}
function handleSocketError(socket, error) {
    if (error instanceof ApiError_1.default) {
        socket.emit('socket_error', createErrorResponse(error.statusCode, error.message));
    }
    else {
        socket.emit('socket_error', createErrorResponse(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Internal server error'));
    }
    console.error(colors_1.default.red(`Socket error: ${error instanceof Error ? error.message : 'Unknown error'}`), error);
}
function extractToken(token) {
    var _a;
    if (typeof token === 'string') {
        if (token.includes('{')) {
            try {
                const parsedToken = JSON.parse(token);
                return ((_a = parsedToken === null || parsedToken === void 0 ? void 0 : parsedToken.token) === null || _a === void 0 ? void 0 : _a.split(' ')[1]) || (parsedToken === null || parsedToken === void 0 ? void 0 : parsedToken.token) || token;
            }
            catch (_b) {
                // If parsing fails, continue with other methods
            }
        }
        if (token.startsWith('Bearer ')) {
            return token.split(' ')[1];
        }
    }
    return token;
}
function getErrorName(statusCode) {
    switch (statusCode) {
        case http_status_codes_1.StatusCodes.BAD_REQUEST:
            return 'Bad Request';
        case http_status_codes_1.StatusCodes.UNAUTHORIZED:
            return 'Unauthorized';
        case http_status_codes_1.StatusCodes.FORBIDDEN:
            return 'Forbidden';
        case http_status_codes_1.StatusCodes.NOT_FOUND:
            return 'Not Found';
        default:
            return 'Error';
    }
}
/**
 * Validate socket event data against schema
 */
const validateEventData = (socket, schema, data) => {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            const zodError = (0, handleZodError_1.default)(error);
            socket.emit('socket_error', {
                statusCode: zodError.statusCode,
                success: false,
                message: zodError.message,
                errorMessages: zodError.errorMessages,
            });
        }
        else {
            socket.emit('socket_error', {
                statusCode: http_status_codes_1.StatusCodes.BAD_REQUEST,
                success: false,
                message: 'Validation failed',
            });
        }
        return null;
    }
};
exports.socketMiddleware = {
    socketAuth,
    validateEventData,
    handleSocketRequest,
};
