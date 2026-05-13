"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DuaController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const dua_service_1 = require("./dua.service");
const getAllDuas = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const category = req.query.category;
    const result = await dua_service_1.DuaService.getAllDuas(lang, category);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Duas fetched successfully',
        data: result,
    });
});
const getDuaById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await dua_service_1.DuaService.getDuaById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Dua fetched successfully',
        data: result,
    });
});
const createDua = (0, catchAsync_1.default)(async (req, res) => {
    const result = await dua_service_1.DuaService.createDua(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Dua created successfully',
        data: result,
    });
});
const getVersion = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const result = await dua_service_1.DuaService.getVersion(lang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Version fetched successfully',
        data: { lang, version: result },
    });
});
const checkSync = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const { version } = req.query;
    const result = await dua_service_1.DuaService.checkSyncMetadata(lang, Number(version) || 0);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Sync status checked successfully',
        data: result,
    });
});
const downloadSync = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const { fromVersion } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await dua_service_1.DuaService.getSyncData(lang, Number(fromVersion) || 0);
    const total = result.length;
    const skip = (page - 1) * limit;
    const paginatedData = result.slice(skip, skip + limit);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Sync data fetched successfully',
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        },
        data: paginatedData,
    });
});
exports.DuaController = {
    getAllDuas,
    getDuaById,
    createDua,
    getVersion,
    checkSync,
    downloadSync,
};
