import express from 'express'
import { PaymentController } from './payment.controller'
import { PaymentValidations } from './payment.validation'
import validateRequest from '../../middleware/validateRequest'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'

const router = express.Router()

router.get(
  '/',
  auth(
    
    USER_ROLES.USER,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  PaymentController.getAllPayments,
)

router.get(
  '/my-payments',
  auth(
    
    USER_ROLES.USER,
        USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  PaymentController.getMyPayments,
)

router.get(
  '/donation-presets',
  PaymentController.getDonationPresets,
)

router.get(
  '/verify-checkout/:sessionId',
  auth(
    USER_ROLES.USER,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  PaymentController.verifyCheckoutSession,
)

router.get(
  '/:id',
  auth(
    USER_ROLES.USER,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  PaymentController.getSinglePayment,
)

router.get(
  '/:id/invoice',
  auth(
    USER_ROLES.USER,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  PaymentController.generateInvoice,
)

router.post(
  '/verify-payment-intent',
  auth(
    USER_ROLES.USER,
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.ADMIN,
  ),
  PaymentController.verifyPaymentIntent,
)

//Add SUPER_ADMIN role protection to the ephemeral-key route for enhanced security
router.post(
  '/ephemeral-key',
  auth(
    USER_ROLES.USER,
    USER_ROLES.ADMIN,
    USER_ROLES.SUPER_ADMIN,
  ),
  PaymentController.createEphemeralKey,
)

// ============================================
// EXISTING ROUTES
// ============================================



router.patch(
  '/:id',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  validateRequest(PaymentValidations.update),
  PaymentController.updatePayment,
)

router.post(
  '/:id/refund',
  auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
  PaymentController.refundPayment,
)

export const PaymentRoutes = router
