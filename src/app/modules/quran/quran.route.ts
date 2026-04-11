import express from 'express';
import { QuranControllers } from './quran.controller';
import validateRequest from '../../middleware/validateRequest';
import { QuranValidations } from './quran.validation';

const router = express.Router();

// Public Routes
router.get('/languages', QuranControllers.getLanguages);
router.get('/surah', QuranControllers.getSurahs); // List surahs
router.get('/surahs', QuranControllers.getSurahs);

router.get(
  '/surah/:number',
  validateRequest(QuranValidations.getSurahDetailValidationSchema),
  QuranControllers.getSurahDetail
);

router.get(
  '/ayah/:surah/:ayah',
  validateRequest(QuranValidations.getAyahValidationSchema),
  QuranControllers.getAyah
);

router.get('/translation', QuranControllers.getAyah); // Mapping /translation to getAyah logic
router.get('/version', QuranControllers.getVersion);
router.get('/search', QuranControllers.search);
router.get('/daily-inspiration', QuranControllers.getDailyInspiration);

// Sync Routes
router.get(
  '/sync/check',
  validateRequest(QuranValidations.checkSyncValidationSchema),
  QuranControllers.checkSync
);
router.get(
  '/sync/download',
  validateRequest(QuranValidations.downloadSyncValidationSchema),
  QuranControllers.downloadSync
);

export const QuranRoutes = router;
