"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeLibraryController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const knowledge_library_service_1 = require("./knowledge-library.service");
const getAllArticles = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'de'; // Default to German ('de')
    const category = req.query.category;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.getAllArticles(lang, category, page, limit);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Articles fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getArticleById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.getArticleById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Article fetched successfully',
        data: result,
    });
});
const createArticle = (0, catchAsync_1.default)(async (req, res) => {
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.createArticle(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Article created successfully',
        data: result,
    });
});
const updateArticle = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.updateArticle(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Article updated successfully',
        data: result,
    });
});
const deleteArticle = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.deleteArticle(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Article deleted successfully',
        data: result,
    });
});
const getVersion = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'de';
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.getVersion(lang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Knowledge version fetched successfully',
        data: { lang, version: result },
    });
});
const checkSync = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'de';
    const { version } = req.query;
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.checkSyncMetadata(lang, Number(version) || 0);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Knowledge sync status checked successfully',
        data: result,
    });
});
const downloadSync = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'de';
    const { fromVersion } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await knowledge_library_service_1.KnowledgeLibraryServices.getSyncData(lang, Number(fromVersion) || 0);
    const total = result.length;
    const skip = (page - 1) * limit;
    const paginatedData = result.slice(skip, skip + limit);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Knowledge sync data fetched successfully',
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: paginatedData,
    });
});
exports.KnowledgeLibraryController = {
    getAllArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deleteArticle,
    getVersion,
    checkSync,
    downloadSync,
};
