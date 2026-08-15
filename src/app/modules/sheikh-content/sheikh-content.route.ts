import express from 'express';
import { SheikhContentController } from './sheikh-content.controller';
import { SheikhContentValidations } from './sheikh-content.validation';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.get(
  '/',
  SheikhContentController.getSpeakerContent
);

router.get(
  '/all',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  SheikhContentController.getAllContents
);

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

export const SheikhContentRoutes = router;
