import express from 'express';
import { BookmarkControllers } from './bookmark.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { BookmarkValidations } from './bookmark.validation';

const router = express.Router();

router.post(
  '/',
  auth(),
  validateRequest(BookmarkValidations.bookmarkValidationSchema),
  BookmarkControllers.addBookmark
);

router.get('/', auth(), BookmarkControllers.getBookmarks);

router.delete('/:id', auth(), BookmarkControllers.removeBookmark);

export const BookmarkRoutes = router;
