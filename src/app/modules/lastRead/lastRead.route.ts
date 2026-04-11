import express from 'express';
import { LastReadController } from './lastRead.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { LastReadValidations } from './lastRead.validation';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.patch(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(LastReadValidations.updateLastReadSchema),
  LastReadController.updateLastRead
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  LastReadController.getLastRead
);

export const LastReadRoutes = router;
