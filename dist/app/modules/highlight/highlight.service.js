"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighlightServices = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const highlight_model_1 = require("./highlight.model");
const addHighlight = async (payload) => {
    const result = await highlight_model_1.Highlight.findOneAndUpdate({ user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber }, payload, { upsert: true, new: true });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to add highlight');
    }
    return result;
};
const getHighlights = async (userId) => {
    const result = await highlight_model_1.Highlight.find({ user: userId }).sort({ createdAt: -1 });
    return result;
};
exports.HighlightServices = {
    addHighlight,
    getHighlights,
};
