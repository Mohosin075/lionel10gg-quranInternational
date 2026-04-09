import express from 'express';
import { PrayerTimeControllers } from './prayer-time.controller';
import auth from '../../middleware/auth';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PrayerTimeControllers.getMyPrayerTimes,
);

router.get(
  '/recitations',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PrayerTimeControllers.getAdhanRecitations,
);

router.patch(
  '/settings',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PrayerTimeControllers.updateSettings,
);

export const PrayerTimeRoutes = router;
