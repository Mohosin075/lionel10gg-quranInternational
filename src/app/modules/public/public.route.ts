import express from 'express'
import { PublicController } from './public.controller'
import validateRequest from '../../middleware/validateRequest'
import { FaqValidations, PublicValidation } from './public.validation'
import { USER_ROLES } from '../../../enum/user'
import auth from '../../middleware/auth'

const router = express.Router()

const adminOnly = auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)

router.get('/faq/all', PublicController.getAllFaqs)
router.get('/faq/single/:id', PublicController.getSingleFaq)
router.post(
  '/faq',
  adminOnly,
  validateRequest(FaqValidations.create),
  PublicController.createFaq,
)
router.patch(
  '/faq/:id',
  adminOnly,
  validateRequest(FaqValidations.update),
  PublicController.updateFaq,
)
router.delete('/faq/:id', adminOnly, PublicController.deleteFaq)

router.post(
  '/contact',
  validateRequest(PublicValidation.contactZodSchema),
  PublicController.createContact,
)

router.get('/:type', PublicController.getAllPublics)
router.post(
  '/',
  adminOnly,
  validateRequest(PublicValidation.create),
  PublicController.createPublic,
)
router.patch(
  '/update/:id',
  adminOnly,
  PublicController.updatePublic,
)
router.delete('/:id', adminOnly, PublicController.deletePublic)

export const PublicRoutes = router
