import express from 'express';
import { LastReadControllers } from './lastRead.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { LastReadValidations } from './lastRead.validation';

const router = express.Router();

router.patch(
  '/',
  auth(),
  validateRequest(LastReadValidations.lastReadValidationSchema),
  LastReadControllers.updateLastRead
);

router.get('/', auth(), LastReadControllers.getLastRead);

export const LastReadRoutes = router;
