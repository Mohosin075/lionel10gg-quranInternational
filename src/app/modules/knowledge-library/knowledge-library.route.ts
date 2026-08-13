import express from 'express';
import { KnowledgeLibraryController } from './knowledge-library.controller';
import { KnowledgeLibraryValidations } from './knowledge-library.validation';
import auth from '../../middleware/auth';
import { checkPremium } from '../../middleware/checkPremium';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Client routes: require authentication (no premium check required per instruction.md)
router.get(
  '/version',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.getVersion
);

router.get(
  '/check-sync',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.checkSync
);

router.get(
  '/download-sync',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.downloadSync
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.getAllArticles
);

// Client routes: Books & Fatwas
router.get(
  '/books',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.getAllBooks
);

router.get(
  '/books/:id',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.getBookById
);

router.get(
  '/fatwas',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.getAllFatwas
);

router.get(
  '/fatwas/:id',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.getFatwaById
);

router.get(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ORGANIZER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.getArticleById
);

// Admin-only management routes: Articles
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

// Admin-only management routes: Books
router.post(
  '/books',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(KnowledgeLibraryValidations.createBookZodSchema),
  KnowledgeLibraryController.createBook
);

router.patch(
  '/books/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(KnowledgeLibraryValidations.updateBookZodSchema),
  KnowledgeLibraryController.updateBook
);

router.delete(
  '/books/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.deleteBook
);

// Admin-only management routes: Fatwas
router.post(
  '/fatwas',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(KnowledgeLibraryValidations.createFatwaZodSchema),
  KnowledgeLibraryController.createFatwa
);

router.patch(
  '/fatwas/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(KnowledgeLibraryValidations.updateFatwaZodSchema),
  KnowledgeLibraryController.updateFatwa
);

router.delete(
  '/fatwas/:id',
  auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  KnowledgeLibraryController.deleteFatwa
);

export const KnowledgeLibraryRoutes = router;
