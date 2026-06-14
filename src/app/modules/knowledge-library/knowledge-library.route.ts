import express from 'express';
import { KnowledgeLibraryController } from './knowledge-library.controller';
import { KnowledgeLibraryValidations } from './knowledge-library.validation';
import auth from '../../middleware/auth';
import { checkPremium } from '../../middleware/checkPremium';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Client routes: require authentication and active premium subscription
router.get(
  '/version',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  KnowledgeLibraryController.getVersion
);

router.get(
  '/check-sync',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  KnowledgeLibraryController.checkSync
);

router.get(
  '/download-sync',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  KnowledgeLibraryController.downloadSync
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  KnowledgeLibraryController.getAllArticles
);

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  checkPremium,
  KnowledgeLibraryController.getArticleById
);

// Admin-only management routes
router.post(
  '/',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(KnowledgeLibraryValidations.createArticleZodSchema),
  KnowledgeLibraryController.createArticle
);

router.patch(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(KnowledgeLibraryValidations.updateArticleZodSchema),
  KnowledgeLibraryController.updateArticle
);

router.delete(
  '/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.deleteArticle
);

export const KnowledgeLibraryRoutes = router;
