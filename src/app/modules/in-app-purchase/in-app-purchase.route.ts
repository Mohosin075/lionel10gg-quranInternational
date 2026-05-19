import express from 'express';
import { InAppPurchaseController } from './in-app-purchase.controller';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { inAppPurchaseValidation } from './in-app-purchase.validation';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.get(
  '/plans',
  InAppPurchaseController.getAvailablePlans,
);

router.get(
  '/plans/:planId',
  InAppPurchaseController.getPlanById,
);

router.post(
  '/verify',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  validateRequest(inAppPurchaseValidation.verifyPurchase),
  InAppPurchaseController.verifyPurchase,
);

router.get(
  '/my-purchases',
  auth(USER_ROLES.ADMIN, USER_ROLES.USER, USER_ROLES.SUPER_ADMIN),
  InAppPurchaseController.getUserPurchases,
);

export const InAppPurchaseRoutes = router;
