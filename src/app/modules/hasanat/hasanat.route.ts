import express from 'express';
import { HasanatController } from './hasanat.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.post(
  '/collect',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  HasanatController.collectHasanat
);

export const HasanatRoutes = router;
