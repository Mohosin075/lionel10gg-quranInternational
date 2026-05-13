"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkServices = void 0;
const http_status_codes_1 = require("http-status-codes");
const ApiError_1 = __importDefault(require("../../../errors/ApiError"));
const bookmark_model_1 = require("./bookmark.model");
const addBookmark = async (payload) => {
    const result = await bookmark_model_1.Bookmark.findOneAndUpdate({ user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber }, payload, { upsert: true, new: true });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.BAD_REQUEST, 'Failed to add bookmark');
    }
    return result;
};
const getBookmarks = async (userId) => {
    const result = await bookmark_model_1.Bookmark.find({ user: userId }).sort({ createdAt: -1 });
    return result;
};
const removeBookmark = async (id, userId) => {
    const result = await bookmark_model_1.Bookmark.findOneAndDelete({ _id: id, user: userId });
    if (!result) {
        throw new ApiError_1.default(http_status_codes_1.StatusCodes.NOT_FOUND, 'Bookmark not found');
    }
    return result;
};
exports.BookmarkServices = {
    addBookmark,
    getBookmarks,
    removeBookmark,
};
