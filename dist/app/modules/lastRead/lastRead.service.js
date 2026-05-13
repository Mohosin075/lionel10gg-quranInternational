"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LastReadServices = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const lastRead_model_1 = require("./lastRead.model");
const updateLastRead = async (payload) => {
    const result = await lastRead_model_1.LastRead.findOneAndUpdate({ user: payload.user }, payload, { upsert: true, new: true });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to update last read');
    }
    return result;
};
const getLastRead = async (userId) => {
    const result = await lastRead_model_1.LastRead.findOne({ user: userId });
    return result;
};
exports.LastReadServices = {
    updateLastRead,
    getLastRead,
};
