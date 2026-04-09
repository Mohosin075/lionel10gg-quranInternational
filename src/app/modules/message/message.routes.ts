import express from 'express'
import { MessageController } from './message.controller'
import auth from '../../middleware/auth'
import { USER_ROLES } from '../../../enum/user'
import { fileAndBodyProcessorUsingDiskStorage } from '../../middleware/processReqBody'
const router = express.Router()

router.post(
  '/',
  fileAndBodyProcessorUsingDiskStorage(),
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MessageController.sendMessage,
)
router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  MessageController.getMessage,
)

export const MessageRoutes = router
