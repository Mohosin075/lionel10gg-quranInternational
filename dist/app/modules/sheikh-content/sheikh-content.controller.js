"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SheikhContentController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const sheikh_content_service_1 = require("./sheikh-content.service");
const createContent = (0, catchAsync_1.default)(async (req, res) => {
    const result = await sheikh_content_service_1.SheikhContentServices.createContent(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Sheikh content created successfully',
        data: result,
    });
});
const updateContent = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await sheikh_content_service_1.SheikhContentServices.updateContent(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Sheikh content updated successfully',
        data: result,
    });
});
const deleteContent = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await sheikh_content_service_1.SheikhContentServices.deleteContent(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Sheikh content deleted successfully',
        data: result,
    });
});
const getSpeakerContent = (0, catchAsync_1.default)(async (req, res) => {
    const speakerName = req.query.speakerName || 'Abu Alia';
    const continuation = req.query.continuation || '';
    const result = continuation
        ? await sheikh_content_service_1.SheikhContentServices.getMoreSpeakerVideos(speakerName, continuation)
        : await sheikh_content_service_1.SheikhContentServices.getSpeakerContent(speakerName);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: continuation
            ? 'More sheikh videos fetched successfully'
            : 'Sheikh content fetched successfully',
        data: result,
    });
});
const getAllContents = (0, catchAsync_1.default)(async (req, res) => {
    const result = await sheikh_content_service_1.SheikhContentServices.getAllContents();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'All sheikh contents fetched successfully',
        data: result,
    });
});
exports.SheikhContentController = {
    createContent,
    updateContent,
    deleteContent,
    getSpeakerContent,
    getAllContents,
};
