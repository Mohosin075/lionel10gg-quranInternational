"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighlightController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const highlight_service_1 = require("./highlight.service");
const addHighlight = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await highlight_service_1.HighlightServices.addHighlight({ ...req.body, user: user.authId });
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Highlight added successfully',
        data: result,
    });
});
const getHighlights = (0, catchAsync_1.default)(async (req, res) => {
    const user = req.user;
    const result = await highlight_service_1.HighlightServices.getHighlights(user.authId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Highlights fetched successfully',
        data: result,
    });
});
exports.HighlightController = {
    addHighlight,
    getHighlights,
};
