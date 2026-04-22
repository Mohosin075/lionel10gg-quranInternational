import express from 'express';
import { USER_ROLES } from '../../../enum/user';
import auth from '../../middleware/auth';
import { DashboardController } from './dashboard.controller';

const router = express.Router();

router.get(
  '/analytics',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  DashboardController.getAnalytics
);

router.get(
  '/user-management',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  DashboardController.getUserManagement
);

router.get(
  '/notification-management',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  DashboardController.getNotificationManagement
);

router.get(
  '/reports',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  DashboardController.getReports
);

export const DashboardRoutes = router;
