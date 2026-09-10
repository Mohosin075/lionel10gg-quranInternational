"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const batch_translate_service_1 = require("./batch-translate.service");
// POST /offline-pack/batch-translate
// Body: { module: "hadith", targetLang: "de" }
const startBatchTranslation = (0, catchAsync_1.default)(async (req, res) => {
    const module = (req.body.module || 'hadith');
    const targetLang = req.body.targetLang;
    if (!targetLang)
        throw new Error('targetLang is required');
    const result = await batch_translate_service_1.BatchTranslateService.createBatchJob(module, targetLang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.ACCEPTED,
        success: true,
        message: `OpenAI Batch translation job started. Poll /batch-status/${result.jobId} to track progress.`,
        data: result,
    });
});
// GET /offline-pack/batch-status/:jobId
const getBatchStatus = (0, catchAsync_1.default)(async (req, res) => {
    const { jobId } = req.params;
    const result = await batch_translate_service_1.BatchTranslateService.checkBatchStatus(jobId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Batch job status fetched',
        data: result,
    });
});
// POST /offline-pack/batch-process/:jobId
// Call this once status is "completed" to save results to MongoDB
const processBatchResult = (0, catchAsync_1.default)(async (req, res) => {
    const { jobId } = req.params;
    const result = await batch_translate_service_1.BatchTranslateService.processBatchResult(jobId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: `Batch results processed and saved to MongoDB`,
        data: result,
    });
});
// GET /offline-pack/batch-jobs
const getBatchJobs = (0, catchAsync_1.default)(async (req, res) => {
    const result = await batch_translate_service_1.BatchTranslateService.listBatchJobs();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Batch jobs fetched successfully',
        data: result,
    });
});
// POST /offline-pack/batch-cancel/:jobId
const cancelBatchJob = (0, catchAsync_1.default)(async (req, res) => {
    const { jobId } = req.params;
    const result = await batch_translate_service_1.BatchTranslateService.cancelBatchJob(jobId);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: `Batch translation job ${jobId} cancelled successfully`,
        data: result,
    });
});
exports.BatchController = {
    startBatchTranslation,
    getBatchStatus,
    processBatchResult,
    getBatchJobs,
    cancelBatchJob,
};
