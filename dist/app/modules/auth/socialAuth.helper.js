"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySocialIdToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const http_status_codes_1 = require("http-status-codes");
const config_1 = __importDefault(require("../../../config"));
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const googleClient = new google_auth_library_1.OAuth2Client(config_1.default.google.client_id);
const verifyGoogleIdToken = async (idToken) => {
    var _a;
    if (!config_1.default.google.client_id) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR, 'Google sign-in is not configured');
    }
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: config_1.default.google.client_id,
        });
        const payload = ticket.getPayload();
        if (!(payload === null || payload === void 0 ? void 0 : payload.sub)) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid Google ID token');
        }
        return {
            appId: payload.sub,
            email: (_a = payload.email) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim(),
            name: payload.name,
            emailVerified: Boolean(payload.email_verified),
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.default) {
            throw error;
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid Google ID token');
    }
};
const verifyAppleIdToken = async (idToken) => {
    const decoded = jsonwebtoken_1.default.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid Apple identity token');
    }
    const response = await fetch('https://appleid.apple.com/auth/keys');
    if (!response.ok) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_GATEWAY, 'Unable to verify Apple identity token');
    }
    const { keys } = (await response.json());
    const jwk = keys.find(key => key.kid === decoded.header.kid);
    if (!jwk) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid Apple identity token');
    }
    const publicKey = crypto_1.default.createPublicKey({ key: jwk, format: 'jwk' });
    const pem = publicKey.export({ type: 'spki', format: 'pem' });
    try {
        const payload = jsonwebtoken_1.default.verify(idToken, pem, {
            algorithms: ['RS256'],
            issuer: 'https://appleid.apple.com',
            audience: config_1.default.apple_client_id || undefined,
        });
        if (!payload.sub) {
            throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid Apple identity token');
        }
        return {
            appId: payload.sub,
            email: typeof payload.email === 'string'
                ? payload.email.toLowerCase().trim()
                : undefined,
            emailVerified: payload.email_verified === true || payload.email_verified === 'true',
        };
    }
    catch (error) {
        if (error instanceof ApiError_1.default) {
            throw error;
        }
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.UNAUTHORIZED, 'Invalid Apple identity token');
    }
};
const verifySocialIdToken = async (provider, idToken) => {
    if (provider === 'google') {
        return verifyGoogleIdToken(idToken);
    }
    return verifyAppleIdToken(idToken);
};
exports.verifySocialIdToken = verifySocialIdToken;
