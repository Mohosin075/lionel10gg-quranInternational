"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuranController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const quran_service_1 = require("./quran.service");
const quran_constants_1 = require("./quran.constants");
const getLanguages = (0, catchAsync_1.default)(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 200;
    const lang = req.query.lang;
    const localization = req.query.localization || 'en';
    const edition = req.query.edition;
    const result = await quran_service_1.QuranServices.fetchLanguages(page, limit, lang, localization, edition);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Languages fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getSurahs = (0, catchAsync_1.default)(async (req, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const language = req.query.language || req.query.lang || 'en';
    const result = await quran_service_1.QuranServices.fetchSurahs(page, limit, language);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Surahs fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getSurahDetail = (0, catchAsync_1.default)(async (req, res) => {
    const { number } = req.params;
    const edition = req.query.edition || 'english_saheeh';
    const lang = req.query.lang || 'en';
    const reciter = req.query.reciter;
    const result = await quran_service_1.QuranServices.getSurahDetail(Number(number), edition, lang, reciter);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Surah detail fetched successfully',
        data: result,
    });
});
const search = (0, catchAsync_1.default)(async (req, res) => {
    const keyword = req.query.q || req.query.keyword;
    const edition = req.query.edition || 'english_saheeh';
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const result = await quran_service_1.QuranServices.searchQuran(keyword, edition, page, limit);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Search results fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getDailyInspiration = (0, catchAsync_1.default)(async (req, res) => {
    const edition = req.query.edition || req.query.lang || req.query.language || 'english_saheeh';
    const lang = req.query.lang || req.query.language;
    const result = await quran_service_1.QuranServices.getDailyInspiration(edition, lang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Daily inspiration fetched successfully',
        data: result,
    });
});
const getAyah = (0, catchAsync_1.default)(async (req, res) => {
    const { surah, ayah } = req.params;
    const edition = req.query.edition || 'english_saheeh';
    const lang = req.query.lang || 'en';
    const reciter = req.query.reciter;
    const result = await quran_service_1.QuranServices.getAyah(Number(surah), Number(ayah), edition, lang, reciter);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Ayah fetched successfully',
        data: result,
    });
});
const getVersion = (0, catchAsync_1.default)(async (req, res) => {
    const { edition } = req.query;
    const result = await quran_service_1.QuranServices.getTranslationVersion(edition);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Version fetched successfully',
        data: { edition, version: result },
    });
});
const syncLanguages = (0, catchAsync_1.default)(async (req, res) => {
    const { edition } = req.query;
    if (edition) {
        // Sync specific edition in background
        quran_service_1.QuranServices.syncEdition(edition);
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
            success: true,
            message: `Sync started for edition: ${edition}`,
        });
    }
    else {
        // Sync all editions in background
        quran_service_1.QuranServices.syncAll();
        (0, sendResponse_1.default)(res, {
            statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
            success: true,
            message: 'Sync started for all editions',
        });
    }
});
const checkSync = (0, catchAsync_1.default)(async (req, res) => {
    const { edition, version } = req.query;
    const result = await quran_service_1.QuranServices.checkSyncMetadata(edition, Number(version) || 0);
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
    const limit = Number(req.query.limit) || 500;
    const result = await quran_service_1.QuranServices.getSyncData(edition, Number(fromVersion) || 0, page, limit);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Sync data fetched successfully',
        meta: result.meta,
        data: result.data,
    });
});
const getReciters = (0, catchAsync_1.default)(async (req, res) => {
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Reciters fetched successfully',
        data: quran_constants_1.POPULAR_RECITERS,
    });
});
const downloadPack = (0, catchAsync_1.default)(async (req, res) => {
    const { edition } = req.query;
    const filePath = await quran_service_1.QuranServices.getGzippedLanguagePack(edition);
    res.sendFile(filePath);
});
exports.QuranController = {
    getLanguages,
    getSurahs,
    getSurahDetail,
    search,
    getDailyInspiration,
    getAyah,
    getVersion,
    syncLanguages,
    checkSync,
    downloadSync,
    getReciters,
    downloadPack
};
