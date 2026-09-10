"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflinePackRoutes = void 0;
const express_1 = __importDefault(require("express"));
const offline_pack_controller_1 = require("./offline-pack.controller");
const batch_translate_controller_1 = require("./batch-translate.controller");
const auth_1 = __importDefault(require("../../middleware/auth"));
const user_1 = require("../../../enum/user");
const router = express_1.default.Router();
// ── Public endpoints (mobile app calls these) ─────────────────────────────────
// Check if a newer pack is available for download
// GET /api/v1/offline-pack/check-sync?module=hadith&lang=de&version=1
router.get('/check-sync', offline_pack_controller_1.OfflinePackController.checkSync);
// Stream the gzip pack file directly (Content-Encoding: gzip)
// GET /api/v1/offline-pack/download/hadith?lang=de
router.get('/download/:module', offline_pack_controller_1.OfflinePackController.downloadPack);
// ── Admin-only: Pack Management ───────────────────────────────────────────────
// POST /api/v1/offline-pack/generate  { module: "hadith", lang: "de" }
router.post('/generate', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), offline_pack_controller_1.OfflinePackController.generatePack);
// GET /api/v1/offline-pack/list
router.get('/list', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), offline_pack_controller_1.OfflinePackController.listPacks);
// GET /api/v1/offline-pack/coverage (Language coverage matrix with live DB & pack counts)
router.get('/coverage', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), offline_pack_controller_1.OfflinePackController.getCoverage);
// ── Admin-only: OpenAI Batch Translation ─────────────────────────────────────
// Step 0: List all batch jobs
// GET /api/v1/offline-pack/batch-jobs
router.get('/batch-jobs', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), batch_translate_controller_1.BatchController.getBatchJobs);
// Step 1: Start a batch translation job
// POST /api/v1/offline-pack/batch-translate  { module: "hadith", targetLang: "de" }
router.post('/batch-translate', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), batch_translate_controller_1.BatchController.startBatchTranslation);
// Step 2: Poll job status
// GET /api/v1/offline-pack/batch-status/:jobId
router.get('/batch-status/:jobId', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), batch_translate_controller_1.BatchController.getBatchStatus);
// Step 3: Once "completed", process & save results to MongoDB
// POST /api/v1/offline-pack/batch-process/:jobId
router.post('/batch-process/:jobId', (0, auth_1.default)(user_1.USER_ROLES.ADMIN, user_1.USER_ROLES.SUPER_ADMIN), batch_translate_controller_1.BatchController.processBatchResult);
exports.OfflinePackRoutes = router;
