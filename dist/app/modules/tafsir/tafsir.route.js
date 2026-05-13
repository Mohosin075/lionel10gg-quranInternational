"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TafsirRoutes = void 0;
const express_1 = __importDefault(require("express"));
const tafsir_controller_1 = require("./tafsir.controller");
const router = express_1.default.Router();
router.get('/version', tafsir_controller_1.TafsirController.getVersion);
router.get('/check-sync', tafsir_controller_1.TafsirController.checkSync);
router.get('/download-sync', tafsir_controller_1.TafsirController.downloadSync);
router.get('/:surah/:ayah', tafsir_controller_1.TafsirController.getTafsir);
router.get('/:surah', tafsir_controller_1.TafsirController.getSurahTafsir);
exports.TafsirRoutes = router;
