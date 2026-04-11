import express from 'express';
import { HighlightController } from './highlight.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { HighlightValidations } from './highlight.validation';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(HighlightValidations.createHighlightSchema),
  HighlightController.addHighlight
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  HighlightController.getHighlights
);

export const HighlightRoutes = router;
