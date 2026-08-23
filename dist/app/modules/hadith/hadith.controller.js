"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HadithController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const hadith_service_1 = require("./hadith.service");
const getAllHadiths = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const category = req.query.category;
    const source = req.query.source;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await hadith_service_1.HadithServices.getAllHadiths(lang, category, source, page, limit);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadiths fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getHadithById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await hadith_service_1.HadithServices.getHadithById(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadith fetched successfully',
        data: result,
    });
});
const createHadith = (0, catchAsync_1.default)(async (req, res) => {
    const result = await hadith_service_1.HadithServices.createHadith(req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.CREATED,
        success: true,
        message: 'Hadith created successfully',
        data: result,
    });
});
const updateHadith = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await hadith_service_1.HadithServices.updateHadith(id, req.body);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadith updated successfully',
        data: result,
    });
});
const deleteHadith = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const result = await hadith_service_1.HadithServices.deleteHadith(id);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadith deleted successfully',
        data: result,
    });
});
const getVersion = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const result = await hadith_service_1.HadithServices.getVersion(lang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadith version fetched successfully',
        data: { lang, version: result },
    });
});
const checkSync = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const { version } = req.query;
    const result = await hadith_service_1.HadithServices.checkSyncMetadata(lang, Number(version) || 0);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadith sync status checked successfully',
        data: result,
    });
});
const downloadSync = (0, catchAsync_1.default)(async (req, res) => {
    const lang = req.query.lang || 'en';
    const { fromVersion } = req.query;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 500;
    const result = await hadith_service_1.HadithServices.getSyncData(lang, Number(fromVersion) || 0, page, limit);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadith sync data fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});
const syncFromGlobalApi = (0, catchAsync_1.default)(async (req, res) => {
    const edition = req.body.edition || 'eng-bukhari';
    const fromHadith = Number(req.body.from) || 1;
    const toHadith = Number(req.body.to) || 10;
    const result = await hadith_service_1.HadithServices.syncFromGlobalApi(edition, fromHadith, toHadith);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Hadiths synced from global API successfully',
        data: result,
    });
});
exports.HadithController = {
    getAllHadiths,
    getHadithById,
    createHadith,
    updateHadith,
    deleteHadith,
    getVersion,
    checkSync,
    downloadSync,
    syncFromGlobalApi,
};
