import express from 'express';
import { HighlightControllers } from './highlight.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { HighlightValidations } from './highlight.validation';

const router = express.Router();

router.post(
  '/',
  auth(),
  validateRequest(HighlightValidations.highlightValidationSchema),
  HighlightControllers.addHighlight
);

router.get('/', auth(), HighlightControllers.getHighlights);

export const HighlightRoutes = router;
