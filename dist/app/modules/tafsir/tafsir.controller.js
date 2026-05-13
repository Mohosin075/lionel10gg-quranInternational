"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TafsirController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const tafsir_service_1 = require("./tafsir.service");
const getTafsir = (0, catchAsync_1.default)(async (req, res) => {
    const { surah, ayah } = req.params;
    const edition = req.query.edition || 'arabic_moyassar';
    const lang = req.query.lang || 'ar';
    const result = await tafsir_service_1.TafsirService.getTafsir(Number(surah), Number(ayah), edition, lang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Tafsir fetched successfully',
        data: result,
    });
});
const getSurahTafsir = (0, catchAsync_1.default)(async (req, res) => {
    const { surah } = req.params;
    const edition = req.query.edition || 'arabic_moyassar';
    const lang = req.query.lang || 'ar';
    const result = await tafsir_service_1.TafsirService.getSurahTafsir(Number(surah), edition, lang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Surah Tafsir fetched successfully',
        data: result,
    });
});
const getVersion = (0, catchAsync_1.default)(async (req, res) => {
    const { edition } = req.query;
    const result = await tafsir_service_1.TafsirService.getTranslationVersion(edition);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Version fetched successfully',
        data: { edition, version: result },
    });
});
const checkSync = (0, catchAsync_1.default)(async (req, res) => {
    const { edition, version } = req.query;
    const result = await tafsir_service_1.TafsirService.checkSyncMetadata(edition, Number(version) || 0);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Sync status checked successfully',
        data: result,
    });
});
const downloadSync = (0, catchAsync_1.default)(async (req, res) => {
    const { edition, fromVersion } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await tafsir_service_1.TafsirService.getSyncData(edition, Number(fromVersion) || 0);
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
exports.TafsirController = {
    getTafsir,
    getSurahTafsir,
    getVersion,
    checkSync,
    downloadSync,
};
