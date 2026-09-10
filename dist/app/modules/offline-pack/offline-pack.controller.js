"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflinePackController = void 0;
const http_status_codes_1 = require("http-status-codes");
const catchAsync_1 = __importDefault(require("../../../shared/catchAsync"));
const sendResponse_1 = __importDefault(require("../../../shared/sendResponse"));
const offline_pack_service_1 = require("./offline-pack.service");
const VALID_MODULES = ['hadith', 'dua', 'knowledge'];
const validateModule = (mod) => {
    if (!VALID_MODULES.includes(mod)) {
        throw new Error(`Invalid module "${mod}". Supported: ${VALID_MODULES.join(', ')}`);
    }
    return mod;
};
// GET /offline-pack/check-sync?module=hadith&lang=de&version=1
const checkSync = (0, catchAsync_1.default)(async (req, res) => {
    const module = validateModule(req.query.module || 'hadith');
    const lang = req.query.lang || 'en';
    const clientVersion = Number(req.query.version) || 0;
    const result = await offline_pack_service_1.OfflinePackService.checkSync(module, lang, clientVersion);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Pack sync status checked successfully',
        data: result,
    });
});
// GET /offline-pack/download/:module?lang=de
// Streams the gzip pack directly from S3 with correct headers for mobile clients
const downloadPack = (0, catchAsync_1.default)(async (req, res) => {
    const module = validateModule(req.params.module);
    const lang = req.query.lang || 'en';
    const { stream, sha256, packSizeMb, version } = await offline_pack_service_1.OfflinePackService.getPackStream(module, lang);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Encoding', 'gzip');
    res.setHeader('X-Pack-Sha256', sha256);
    res.setHeader('X-Pack-Version', String(version));
    res.setHeader('X-Pack-Size-Mb', String(packSizeMb));
    res.setHeader('Content-Disposition', `attachment; filename="${module}_${lang}_v${version}.json.gz"`);
    stream.pipe(res);
});
// POST /offline-pack/generate  (Admin only)
// Body: { module: "hadith", lang: "de" }
const generatePack = (0, catchAsync_1.default)(async (req, res) => {
    const module = validateModule(req.body.module || 'hadith');
    const lang = req.body.lang || 'en';
    const result = await offline_pack_service_1.OfflinePackService.generateAndUploadPack(module, lang);
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: `Pack generated and uploaded to S3 successfully`,
        data: result,
    });
});
// GET /offline-pack/list  (Admin: see all generated packs)
const listPacks = (0, catchAsync_1.default)(async (_req, res) => {
    const result = await offline_pack_service_1.OfflinePackService.listPacks();
    (0, sendResponse_1.default)(res, {
        statusCode: http_status_codes_1.StatusCodes.OK,
        success: true,
        message: 'Offline packs listed successfully',
        data: result,
    });
});
exports.OfflinePackController = {
    checkSync,
    downloadPack,
    generatePack,
    listPacks,
};
