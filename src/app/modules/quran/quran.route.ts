import express from 'express';
import { QuranController } from './quran.controller';
import validateRequest from '../../middleware/validateRequest';
import { QuranValidations } from './quran.validation';

const router = express.Router();

// Public Routes
router.get('/languages', QuranController.getLanguages);
router.get('/surah', QuranController.getSurahs); // List surahs
router.get('/surahs', QuranController.getSurahs);

router.get(
  '/surah/:number',
  validateRequest(QuranValidations.getSurahDetailValidationSchema),
  QuranController.getSurahDetail
);

router.get(
  '/ayah/:surah/:ayah',
  validateRequest(QuranValidations.getAyahValidationSchema),
  QuranController.getAyah
);

router.get('/translation', QuranController.getAyah); // Mapping /translation to getAyah logic
router.get('/version', QuranController.getVersion);
router.get('/search', QuranController.search);
router.get('/daily-inspiration', QuranController.getDailyInspiration);

// Sync Routes
router.get(
  '/sync/check',
  validateRequest(QuranValidations.checkSyncValidationSchema),
  QuranController.checkSync
);
router.get(
  '/sync/download',
  validateRequest(QuranValidations.downloadSyncValidationSchema),
  QuranController.downloadSync
);

export const QuranRoutes = router;
