"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookmarkController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const bookmark_service_1 = require("./bookmark.service");
const addBookmark = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await bookmark_service_1.BookmarkServices.addBookmark({ ...req.body, user: user.authId });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Bookmark added successfully',
        data: result,
    });
});
const getBookmarks = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await bookmark_service_1.BookmarkServices.getBookmarks(user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Bookmarks fetched successfully',
        data: result,
    });
});
const removeBookmark = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const { id } = req.params;
    const result = await bookmark_service_1.BookmarkServices.removeBookmark(id, user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Bookmark removed successfully',
        data: result,
    });
});
exports.BookmarkController = {
    addBookmark,
    getBookmarks,
    removeBookmark,
};
