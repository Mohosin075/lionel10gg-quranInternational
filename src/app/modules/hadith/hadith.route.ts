import express from 'express';
import { HadithController } from './hadith.controller';
import { HadithValidations } from './hadith.validation';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Public content — app reads/syncs without login
router.get('/version', HadithController.getVersion);
router.get('/check-sync', HadithController.checkSync);
router.get('/download-sync', HadithController.downloadSync);
router.get('/', HadithController.getAllHadiths);
router.get('/:id', HadithController.getHadithById);

// Admin-only management
router.post(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(HadithValidations.createHadithZodSchema),
  HadithController.createHadith
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(HadithValidations.updateHadithZodSchema),
  HadithController.updateHadith
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  HadithController.deleteHadith
);

router.post(
  '/sync-external',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  HadithController.syncFromGlobalApi
);

export const HadithRoutes = router;
