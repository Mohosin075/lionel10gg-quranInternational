import express from 'express';
import { QuranControllers } from './quran.controller';
import auth from '../../middleware/auth';

const router = express.Router();

// Public Routes
router.get('/editions', QuranControllers.getEditions);
router.get('/surahs', QuranControllers.getSurahs);
router.get('/surah/:number', QuranControllers.getSurahDetail);
router.get('/juz/:number', QuranControllers.getJuz);
router.get('/search', QuranControllers.search);
router.get('/daily-inspiration', QuranControllers.getDailyInspiration);

// Private Routes (Require Authentication)
router.post('/bookmark', auth(), QuranControllers.addBookmark);
router.get('/bookmarks', auth(), QuranControllers.getBookmarks);
router.delete('/bookmark/:id', auth(), QuranControllers.removeBookmark);

router.post('/highlight', auth(), QuranControllers.addHighlight);
router.get('/highlights', auth(), QuranControllers.getHighlights);

router.patch('/last-read', auth(), QuranControllers.updateLastRead);
router.get('/last-read', auth(), QuranControllers.getLastRead);

export const QuranRoutes = router;
