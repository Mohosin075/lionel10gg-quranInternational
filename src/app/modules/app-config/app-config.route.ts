import express from 'express';
import { AppConfigController } from './app-config.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Public: App fetches config/banners without authentication
router.get('/', AppConfigController.getAppConfig);

// Admin: Manage banners, maintenance mode, and app settings
router.patch(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AppConfigController.updateAppConfig,
);

router.post(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  AppConfigController.updateAppConfig,
);

export const AppConfigRoutes = router;
