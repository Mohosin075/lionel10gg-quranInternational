import express from 'express';
import { BookmarkController } from './bookmark.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { BookmarkValidations } from './bookmark.validation';
import { USER_ROLES } from '../../../enum/user';

const router = express.Router();

router.post(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  validateRequest(BookmarkValidations.createBookmarkSchema),
  BookmarkController.addBookmark
);

router.get(
  '/',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BookmarkController.getBookmarks
);

router.delete(
  '/:id',
  auth(USER_ROLES.USER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  BookmarkController.removeBookmark
);

export const BookmarkRoutes = router;
