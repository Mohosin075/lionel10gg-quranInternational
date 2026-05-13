import express from 'express';
import { TafsirController } from './tafsir.controller';

const router = express.Router();

router.get('/version', TafsirController.getVersion);
router.get('/check-sync', TafsirController.checkSync);
router.get('/download-sync', TafsirController.downloadSync);
router.get('/:surah/:ayah', TafsirController.getTafsir);
router.get('/:surah', TafsirController.getSurahTafsir);

export const TafsirRoutes = router;
