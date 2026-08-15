import express from 'express';
import { KnowledgeLibraryController } from './knowledge-library.controller';
import { KnowledgeLibraryValidations } from './knowledge-library.validation';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

// Public content — app reads/syncs without login
router.get('/version', KnowledgeLibraryController.getVersion);
router.get('/check-sync', KnowledgeLibraryController.checkSync);
router.get('/download-sync', KnowledgeLibraryController.downloadSync);
router.get('/', KnowledgeLibraryController.getAllArticles);
router.get('/books', KnowledgeLibraryController.getAllBooks);
router.get('/books/:id', KnowledgeLibraryController.getBookById);
router.get('/fatwas', KnowledgeLibraryController.getAllFatwas);
router.get('/fatwas/:id', KnowledgeLibraryController.getFatwaById);
router.get('/:id', KnowledgeLibraryController.getArticleById);

// Admin-only management
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
