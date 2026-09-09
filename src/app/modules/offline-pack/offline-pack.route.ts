import express from 'express';
import { OfflinePackController } from './offline-pack.controller';
import { BatchController } from './batch-translate.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// ── Public endpoints (mobile app calls these) ─────────────────────────────────
// Check if a newer pack is available for download
// GET /api/v1/offline-pack/check-sync?module=hadith&lang=de&version=1
router.get('/check-sync', OfflinePackController.checkSync);

// Stream the gzip pack file directly (Content-Encoding: gzip)
// GET /api/v1/offline-pack/download/hadith?lang=de
router.get('/download/:module', OfflinePackController.downloadPack);

// ── Admin-only: Pack Management ───────────────────────────────────────────────
// POST /api/v1/offline-pack/generate  { module: "hadith", lang: "de" }
router.post(
  '/generate',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  OfflinePackController.generatePack,
);

// GET /api/v1/offline-pack/list
router.get(
  '/list',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  OfflinePackController.listPacks,
);

// ── Admin-only: OpenAI Batch Translation ─────────────────────────────────────
// Step 1: Start a batch translation job
// POST /api/v1/offline-pack/batch-translate  { module: "hadith", targetLang: "de" }
router.post(
  '/batch-translate',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BatchController.startBatchTranslation,
);

// Step 2: Poll job status
// GET /api/v1/offline-pack/batch-status/:jobId
router.get(
  '/batch-status/:jobId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BatchController.getBatchStatus,
);

// Step 3: Once "completed", process & save results to MongoDB
// POST /api/v1/offline-pack/batch-process/:jobId
router.post(
  '/batch-process/:jobId',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BatchController.processBatchResult,
);

export const OfflinePackRoutes = router;
