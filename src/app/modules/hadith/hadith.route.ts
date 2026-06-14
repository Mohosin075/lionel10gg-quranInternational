import express from 'express';
import { HadithController } from './hadith.controller';
import { HadithValidations } from './hadith.validation';
import auth from '../../middleware/auth';
import { checkPremium } from '../../middleware/checkPremium';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Client routes: require authentication and active premium subscription
router.get(
  '/version',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  HadithController.getVersion
);

router.get(
  '/check-sync',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  HadithController.checkSync
);

router.get(
  '/download-sync',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  HadithController.downloadSync
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  HadithController.getAllHadiths
);

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  HadithController.getHadithById
);

// Admin-only management routes
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

export const HadithRoutes = router;
