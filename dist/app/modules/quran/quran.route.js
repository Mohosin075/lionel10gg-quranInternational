"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuranRoutes = void 0;
const express_1 = __importDefault(require("express"));
const quran_controller_1 = require("./quran.controller");
const validateRequest_1 = __importDefault(require("../../middleware/validateRequest"));
const quran_validation_1 = require("./quran.validation");
const router = express_1.default.Router();
// Public Routes
router.get('/languages', quran_controller_1.QuranController.getLanguages);
router.get('/surahs', quran_controller_1.QuranController.getSurahs); // List all surahs
// router.get('/surah', QuranController.getSurahs); // Alias for list
router.get('/surah/:number', (0, validateRequest_1.default)(quran_validation_1.QuranValidations.getSurahDetailValidationSchema), quran_controller_1.QuranController.getSurahDetail);
router.get('/ayah/:surah/:ayah', (0, validateRequest_1.default)(quran_validation_1.QuranValidations.getAyahValidationSchema), quran_controller_1.QuranController.getAyah);
router.get('/translation/:surah/:ayah', (0, validateRequest_1.default)(quran_validation_1.QuranValidations.getAyahValidationSchema), quran_controller_1.QuranController.getAyah); // Alias for getAyah logic
router.get('/version', quran_controller_1.QuranController.getVersion);
router.get('/search', quran_controller_1.QuranController.search);
router.get('/daily-inspiration', quran_controller_1.QuranController.getDailyInspiration);
// Sync Routes
router.post('/sync/languages', quran_controller_1.QuranController.syncLanguages);
router.get('/sync/check', (0, validateRequest_1.default)(quran_validation_1.QuranValidations.checkSyncValidationSchema), quran_controller_1.QuranController.checkSync);
router.get('/sync/download', (0, validateRequest_1.default)(quran_validation_1.QuranValidations.downloadSyncValidationSchema), quran_controller_1.QuranController.downloadSync);
exports.QuranRoutes = router;
