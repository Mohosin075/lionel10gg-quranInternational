import express from 'express';
import { SheikhContentController } from './sheikh-content.controller';
import { SheikhContentValidations } from './sheikh-content.validation';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// User accessible routes (Non-Subscription feature)
router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  SheikhContentController.getSpeakerContent
);

// Admin-only routes
router.post(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(SheikhContentValidations.createSheikhContentZodSchema),
  SheikhContentController.createContent
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(SheikhContentValidations.updateSheikhContentZodSchema),
  SheikhContentController.updateContent
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  SheikhContentController.deleteContent
);

router.get(
  '/all',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  SheikhContentController.getAllContents
);

export const SheikhContentRoutes = router;
