"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenServices = void 0;
const mongoose_1 = require("mongoose");
const token_model_1 = require("./token.model");
const user_model_1 = require("../user/user.model");
const logout = async (userId) => {
    const [tokenResult] = await Promise.all([
        token_model_1.Token.updateMany({
            user: new mongoose_1.Types.ObjectId(userId),
        }, {
            expireAt: new Date(),
            token: '',
        }),
        user_model_1.User.findByIdAndUpdate(userId, {
            $set: { 'authentication.passwordChangedAt': new Date() },
        }),
    ]);
    return tokenResult;
};
exports.TokenServices = {
    logout,
};
