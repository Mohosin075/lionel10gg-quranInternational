"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomAuthServices = void 0;
const http_status_codes_1 = require("http-status-codes");
const user_model_1 = require("../../user/user.model");
const auth_helper_1 = require("../auth.helper");
const ApiError_1 = __importDefault(require("../../../../errors/ApiError"));
const user_1 = require("../../../../enum/user");
const config_1 = __importDefault(require("../../../../config"));
const token_model_1 = require("../../token/token.model");
const emailTemplate_1 = require("../../../../shared/emailTemplate");
const crypto_1 = __importStar(require("../../../../utils/crypto"));
const socialAuth_helper_1 = require("../socialAuth.helper");
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_2 = __importDefault(require("crypto"));
const common_1 = require("../common");
const jwtHelper_1 = require("../../../../helpers/jwtHelper");
const emailHelper_1 = require("../../../../helpers/emailHelper");
// import { emailQueue } from '../../../../helpers/bull-mq-producer'
const createUser = async (payload) => {
    var _a;
    payload.email = (_a = payload.email) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim();
    const isUserExist = await user_model_1.User.findOne({
        email: payload.email,
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    });
    if (isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `An account with this email already exist, please login or try with another email.`);
    }
    const otp = (0, crypto_1.generateOtp)();
    const otpExpiresIn = new Date(Date.now() + 5 * 60 * 1000);
    const authentication = {
        email: payload.email,
        oneTimeCode: (0, crypto_1.hashOtp)(otp),
        expiresAt: otpExpiresIn,
        latestRequestAt: new Date(),
        requestCount: 1,
        authType: 'createAccount',
        isVerified: false,
    };
    // Send email with OTP
    const createAccount = emailTemplate_1.emailTemplate.createAccount({
        name: payload.name,
        email: payload.email.toLowerCase().trim(),
        otp,
    });
    emailHelper_1.emailHelper.sendEmail(createAccount);
    const user = await user_model_1.User.create({
        ...payload,
        password: payload.password,
        authentication,
    });
    if (!user) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create user.');
    }
    return {
        success: true,
        message: 'Registration successful and OTP sent to your email',
        data: {
            email: user.email,
        },
    };
};
const customLogin = async (payload) => {
    const { email, phone } = payload;
    const query = email ? { email: email.toLowerCase().trim() } : { phone: phone };
    const isUserExist = await user_model_1.User.findOne({
        ...query,
        status: { $in: [user_1.USER_STATUS.ACTIVE] },
    })
        .select('+password +authentication')
        .lean();
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }
    if (!isUserExist.password) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }
    const result = await common_1.AuthCommonServices.handleLoginLogic(payload, isUserExist);
    return result;
};
const adminLogin = async (payload) => {
    const { email, phone } = payload;
    const query = email ? { email: email.trim().toLowerCase() } : { phone: phone };
    const isUserExist = await user_model_1.User.findOne({
        ...query,
    })
        .select('+password +authentication')
        .lean();
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }
    if (isUserExist.role !== user_1.USER_ROLES.ADMIN &&
        isUserExist.role !== user_1.USER_ROLES.SUPER_ADMIN) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }
    if (isUserExist.status !== user_1.USER_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }
    const isPasswordMatch = await auth_helper_1.AuthHelper.isPasswordMatched(payload.password, isUserExist.password);
    if (!isPasswordMatch) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid email or password');
    }
    //tokens
    const tokens = auth_helper_1.AuthHelper.createToken(isUserExist._id, isUserExist.role, isUserExist.name, isUserExist.email);
    return (0, common_1.authResponse)(http_status_codes_1.StatusCodes.OK, `Welcome back ${isUserExist.name}`, isUserExist.role, tokens.accessToken, tokens.refreshToken);
};
const forgetPassword = async (email, phone) => {
    if (phone && !email) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Password reset via phone is not available. Please use email.');
    }
    if (!email) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Email is required');
    }
    const isUserExist = await user_model_1.User.findOne({
        email: email.toLowerCase().trim(),
        status: { $in: [user_1.USER_STATUS.ACTIVE, user_1.USER_STATUS.INACTIVE] },
    });
    if (!isUserExist) {
        return 'If an account exists, an OTP has been sent.';
    }
    const otp = (0, crypto_1.generateOtp)();
    const authentication = {
        email: isUserExist.email,
        resetPassword: true,
        oneTimeCode: (0, crypto_1.hashOtp)(otp),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        latestRequestAt: new Date(),
        requestCount: 1,
        authType: 'resetPassword',
    };
    await user_model_1.User.findByIdAndUpdate(isUserExist._id, {
        $set: { authentication: authentication },
    }, { new: true });
    const forgetPasswordEmailTemplate = emailTemplate_1.emailTemplate.resetPassword({
        name: isUserExist.name,
        email: isUserExist.email,
        otp,
    });
    emailHelper_1.emailHelper.sendEmail(forgetPasswordEmailTemplate);
    return 'If an account exists, an OTP has been sent.';
};
const resetPassword = async (resetToken, payload) => {
    const { newPassword, confirmPassword } = payload;
    if (newPassword !== confirmPassword) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Passwords do not match');
    }
    const normalizedToken = (resetToken === null || resetToken === void 0 ? void 0 : resetToken.startsWith('Bearer '))
        ? resetToken.split(' ')[1]
        : resetToken;
    const isTokenExist = await token_model_1.Token.findOne({ token: normalizedToken }).lean();
    if (!isTokenExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, "You don't have authorization to reset your password, please verify your account first.");
    }
    const isUserExist = await user_model_1.User.findById(isTokenExist.user)
        .select('+authentication')
        .lean();
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Something went wrong, please try again. or contact support.');
    }
    const { authentication } = isUserExist;
    if (!(authentication === null || authentication === void 0 ? void 0 : authentication.resetPassword)) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You don\'t have permission to change the password. Please click again to "Forgot Password"');
    }
    const isTokenValid = (isTokenExist === null || isTokenExist === void 0 ? void 0 : isTokenExist.expireAt) > new Date();
    if (!isTokenValid) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Your reset token has expired, please try again.');
    }
    const hashPassword = await bcrypt_1.default.hash(newPassword, Number(config_1.default.bcrypt_salt_rounds));
    const updatedUserData = {
        password: hashPassword,
        authentication: {
            resetPassword: false,
            otp: '',
            expiresAt: null,
            latestRequestAt: null,
            requestCount: 0,
            authType: '',
            passwordChangedAt: new Date(),
        },
    };
    await user_model_1.User.findByIdAndUpdate(isUserExist._id, { $set: updatedUserData }, { new: true });
    return { message: 'Password reset successfully' };
};
const verifyAccount = async (email, onetimeCode) => {
    //verify fo new user
    if (!onetimeCode) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'OTP is required.');
    }
    const isUserExist = await user_model_1.User.findOne({
        email: email.toLowerCase().trim(),
        status: { $nin: [user_1.USER_STATUS.DELETED] },
    })
        .select('+password +authentication')
        .lean();
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `No account found with this ${email}, please register first.`);
    }
    const { authentication } = isUserExist;
    const storedOtp = authentication === null || authentication === void 0 ? void 0 : authentication.oneTimeCode;
    const otpMatches = storedOtp
        ? storedOtp.length === 64
            ? (0, crypto_1.compareOtp)(onetimeCode, storedOtp)
            : storedOtp === onetimeCode
        : false;
    if (!otpMatches) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Invalid OTP, please try again.');
    }
    const currentDate = new Date();
    if ((authentication === null || authentication === void 0 ? void 0 : authentication.expiresAt) && authentication.expiresAt < currentDate) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'OTP has expired, please try again.');
    }
    //either newly created user or existing user
    if (!isUserExist.verified) {
        await user_model_1.User.findByIdAndUpdate(isUserExist._id, { $set: { verified: true } }, { new: true });
        const tokens = auth_helper_1.AuthHelper.createToken(isUserExist._id, isUserExist.role, isUserExist.name, isUserExist.email);
        return (0, common_1.authResponse)(http_status_codes_1.StatusCodes.OK, `Welcome ${isUserExist.name} to our platform.`, isUserExist.role, tokens.accessToken, tokens.refreshToken);
    }
    else {
        await user_model_1.User.findByIdAndUpdate(isUserExist._id, {
            $set: {
                authentication: {
                    oneTimeCode: '',
                    expiresAt: null,
                    latestRequestAt: null,
                    requestCount: 0,
                    authType: '',
                    resetPassword: true,
                },
            },
        }, { new: true });
        const token = await token_model_1.Token.create({
            token: (0, crypto_1.default)(),
            user: isUserExist._id,
            expireAt: new Date(Date.now() + 5 * 60 * 1000), // 15 minutes
        });
        if (!token) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Something went wrong, please try again. or contact support.');
        }
        return (0, common_1.authResponse)(http_status_codes_1.StatusCodes.OK, 'OTP verified successfully, please reset your password.', undefined, undefined, undefined, token === null || token === void 0 ? void 0 : token.token);
    }
};
const getRefreshToken = async (token) => {
    var _a;
    try {
        const decodedToken = jwtHelper_1.jwtHelper.verifyToken(token, config_1.default.jwt.jwt_refresh_secret);
        const { authId, role } = decodedToken;
        const userId = authId || decodedToken.userId;
        const dbUser = await user_model_1.User.findById(userId).select('+authentication');
        if (!dbUser || dbUser.status !== user_1.USER_STATUS.ACTIVE) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Account is not active');
        }
        if (decodedToken.iat &&
            ((_a = dbUser.authentication) === null || _a === void 0 ? void 0 : _a.passwordChangedAt) &&
            decodedToken.iat * 1000 < dbUser.authentication.passwordChangedAt.getTime()) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Session has been revoked, please login again');
        }
        const tokens = auth_helper_1.AuthHelper.createToken(userId, role, decodedToken.name, decodedToken.email);
        return {
            accessToken: tokens.accessToken,
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.default) {
            throw error;
        }
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Refresh Token has expired');
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.FORBIDDEN, 'Invalid Refresh Token');
    }
};
const socialLogin = async (provider, idToken, deviceToken) => {
    const identity = await (0, socialAuth_helper_1.verifySocialIdToken)(provider, idToken);
    let isUserExist = await user_model_1.User.findOne({
        appId: identity.appId,
        status: { $in: [user_1.USER_STATUS.ACTIVE, user_1.USER_STATUS.INACTIVE] },
    });
    if (!isUserExist &&
        identity.email &&
        identity.emailVerified) {
        isUserExist = await user_model_1.User.findOne({
            email: identity.email,
            status: { $in: [user_1.USER_STATUS.ACTIVE, user_1.USER_STATUS.INACTIVE] },
        });
    }
    if (!isUserExist) {
        if (!identity.email) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Social login did not provide a verified email');
        }
        const createdUser = await user_model_1.User.create({
            appId: identity.appId,
            email: identity.email,
            name: identity.name,
            deviceToken,
            provider,
            status: user_1.USER_STATUS.ACTIVE,
            verified: true,
            password: crypto_2.default.randomUUID(),
        });
        if (!createdUser) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to create user.');
        }
        const tokens = auth_helper_1.AuthHelper.createToken(createdUser._id, createdUser.role, createdUser.name, createdUser.email);
        return (0, common_1.authResponse)(http_status_codes_1.StatusCodes.OK, `Welcome ${createdUser.name} to our platform.`, createdUser.role, tokens.accessToken, tokens.refreshToken);
    }
    if (isUserExist.status !== user_1.USER_STATUS.ACTIVE) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Account is not active');
    }
    await user_model_1.User.findByIdAndUpdate(isUserExist._id, {
        $set: {
            deviceToken,
            appId: identity.appId,
            provider,
        },
    });
    const tokens = auth_helper_1.AuthHelper.createToken(isUserExist._id, isUserExist.role, isUserExist.name, isUserExist.email);
    return (0, common_1.authResponse)(http_status_codes_1.StatusCodes.OK, `Welcome back ${isUserExist.name}`, isUserExist.role, tokens.accessToken, tokens.refreshToken);
};
const resendOtpToPhoneOrEmail = async (authType, email, phone) => {
    const query = email ? { email: email } : { phone: phone };
    const isUserExist = await user_model_1.User.findOne({
        ...query,
        status: { $in: [user_1.USER_STATUS.ACTIVE, user_1.USER_STATUS.INACTIVE] },
    }).select('+authentication');
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, `No account found with this ${email ? 'email' : 'phone'}`);
    }
    if (phone && !email) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Phone verification is not available. Please use email.');
    }
    const { authentication } = isUserExist;
    const windowMs = 15 * 60 * 1000;
    let requestCount = (authentication === null || authentication === void 0 ? void 0 : authentication.requestCount) || 0;
    if ((authentication === null || authentication === void 0 ? void 0 : authentication.latestRequestAt) &&
        Date.now() - new Date(authentication.latestRequestAt).getTime() > windowMs) {
        requestCount = 0;
    }
    if (requestCount >= 5) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have exceeded the maximum number of requests. Please try again later.');
    }
    const otp = (0, crypto_1.generateOtp)();
    const updatedAuthentication = {
        oneTimeCode: (0, crypto_1.hashOtp)(otp),
        latestRequestAt: new Date(),
        requestCount: requestCount + 1,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        authType,
    };
    if (email) {
        const template = emailTemplate_1.emailTemplate.resendOtp({
            email: isUserExist.email,
            name: isUserExist.name,
            otp,
            type: authType,
        });
        emailHelper_1.emailHelper.sendEmail(template);
        await user_model_1.User.findByIdAndUpdate(isUserExist._id, {
            $set: { authentication: updatedAuthentication },
        }, { new: true });
    }
};
const deleteAccount = async (user, password) => {
    const { authId } = user;
    const isUserExist = await user_model_1.User.findById(authId).select('+password');
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to delete account. Please try again.');
    }
    if (isUserExist.status === user_1.USER_STATUS.DELETED) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Requested user is already deleted.');
    }
    const isPasswordMatched = await bcrypt_1.default.compare(password, isUserExist.password);
    if (!isPasswordMatched) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Please provide a valid password to delete your account.');
    }
    const deletedData = await user_model_1.User.findByIdAndUpdate(authId, {
        $set: {
            status: user_1.USER_STATUS.DELETED,
            'authentication.passwordChangedAt': new Date(),
        },
    });
    return {
        status: http_status_codes_1.StatusCodes.OK,
        message: 'Account deleted successfully.',
        deletedData,
    };
};
const resendOtp = async (email, authType) => {
    const isUserExist = await user_model_1.User.findOne({
        email: email.toLowerCase().trim(),
        status: { $in: [user_1.USER_STATUS.ACTIVE, user_1.USER_STATUS.INACTIVE] },
    }).select('+authentication');
    if (!isUserExist) {
        return 'If an account exists, an OTP has been sent.';
    }
    const { authentication } = isUserExist;
    const windowMs = 15 * 60 * 1000;
    let requestCount = (authentication === null || authentication === void 0 ? void 0 : authentication.requestCount) || 0;
    if ((authentication === null || authentication === void 0 ? void 0 : authentication.latestRequestAt) &&
        Date.now() - new Date(authentication.latestRequestAt).getTime() > windowMs) {
        requestCount = 0;
    }
    if (requestCount >= 5) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'You have exceeded the maximum number of requests. Please try again later.');
    }
    const otp = (0, crypto_1.generateOtp)();
    const authenticationPayload = {
        oneTimeCode: (0, crypto_1.hashOtp)(otp),
        latestRequestAt: new Date(),
        requestCount: requestCount + 1,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        authType,
    };
    await user_model_1.User.findByIdAndUpdate(isUserExist._id, {
        $set: { authentication: authenticationPayload },
    }, { new: true });
    const forgetPasswordEmailTemplate = emailTemplate_1.emailTemplate.resendOtp({
        email: email,
        name: isUserExist.name,
        otp,
        type: authType,
    });
    emailHelper_1.emailHelper.sendEmail(forgetPasswordEmailTemplate);
    return 'If an account exists, an OTP has been sent.';
};
const changePassword = async (user, currentPassword, newPassword) => {
    // Find the user with password field
    const isUserExist = await user_model_1.User.findById(user.authId)
        .select('+password')
        .lean();
    if (!isUserExist) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'User not found');
    }
    // Check if current password matches
    const isPasswordMatch = await auth_helper_1.AuthHelper.isPasswordMatched(currentPassword, isUserExist.password);
    if (!isPasswordMatch) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Current password is incorrect');
    }
    // Hash the new password
    const hashedPassword = await bcrypt_1.default.hash(newPassword, Number(config_1.default.bcrypt_salt_rounds));
    // Update the password
    await user_model_1.User.findByIdAndUpdate(user.authId, {
        password: hashedPassword,
        'authentication.passwordChangedAt': new Date(),
    }, { new: true });
    return { message: 'Password changed successfully' };
};
exports.CustomAuthServices = {
    adminLogin,
    forgetPassword,
    resetPassword,
    verifyAccount,
    customLogin,
    getRefreshToken,
    socialLogin,
    resendOtpToPhoneOrEmail,
    deleteAccount,
    resendOtp,
    changePassword,
    createUser,
};
