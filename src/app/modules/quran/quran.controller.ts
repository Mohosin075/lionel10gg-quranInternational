import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { QuranServices } from './quran.service';
import { JwtPayload } from 'jsonwebtoken';

const getLanguages = catchAsync(async (req: Request, res: Response) => {
  const result = await QuranServices.fetchLanguages();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Languages fetched successfully',
    data: result,
  });
});

const getSurahs = catchAsync(async (req: Request, res: Response) => {
  const result = await QuranServices.fetchSurahs();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Surahs fetched successfully',
    data: result,
  });
});

const getSurahDetail = catchAsync(async (req: Request, res: Response) => {
  const { number } = req.params;
  const edition = req.query.edition as string || 'english_saheeh';
  const result = await QuranServices.fetchSurahDetail(Number(number), edition);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Surah detail fetched successfully',
    data: result,
  });
});

const search = catchAsync(async (req: Request, res: Response) => {
  const keyword = req.query.q as string || req.query.keyword as string;
  const edition = req.query.edition as string || 'english_saheeh';
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  
  const result = await QuranServices.searchQuran(keyword, edition, page, limit);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Search results fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getDailyInspiration = catchAsync(async (req: Request, res: Response) => {
  const edition = req.query.edition as string || 'english_saheeh';
  const result = await QuranServices.getDailyInspiration(edition);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Daily inspiration fetched successfully',
    data: result,
  });
});

const addBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await QuranServices.addBookmark({ ...req.body, user });
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Bookmark added successfully',
    data: result,
  });
});

const getBookmarks = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await QuranServices.getBookmarks(user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Bookmarks fetched successfully',
    data: result,
  });
});

const removeBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const { id } = req.params;
  const result = await QuranServices.removeBookmark(id, user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Bookmark removed successfully',
    data: result,
  });
});

const addHighlight = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await QuranServices.addHighlight({ ...req.body, user });
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Highlight added successfully',
    data: result,
  });
});

const getHighlights = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await QuranServices.getHighlights(user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Highlights fetched successfully',
    data: result,
  });
});

const updateLastRead = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await QuranServices.updateLastRead({ ...req.body, user });
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Last read updated successfully',
    data: result,
  });
});

const getLastRead = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await QuranServices.getLastRead(user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Last read fetched successfully',
    data: result,
  });
});

const getAyah = catchAsync(async (req: Request, res: Response) => {
  const { surah, ayah } = req.params;
  const edition = req.query.edition as string || 'english_saheeh';
  const lang = req.query.lang as string || 'en';
  const result = await QuranServices.getAyah(Number(surah), Number(ayah), edition, lang);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Ayah fetched successfully',
    data: result,
  });
});

const getVersion = catchAsync(async (req: Request, res: Response) => {
  const { edition } = req.query;
  const result = await QuranServices.getTranslationVersion(edition as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Version fetched successfully',
    data: { edition, version: result },
  });
});

const checkSync = catchAsync(async (req: Request, res: Response) => {
    const { edition, version } = req.query;
    const result = await QuranServices.checkSyncMetadata(edition as string, Number(version) || 0);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Sync status checked successfully',
        data: result,
    });
});

const downloadSync = catchAsync(async (req: Request, res: Response) => {
    const { edition, fromVersion } = req.query;
    const result = await QuranServices.getSyncData(edition as string, Number(fromVersion) || 0);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Sync data fetched successfully',
        data: result,
    });
});

export const QuranControllers = {
  getLanguages,
  getSurahs,
  getSurahDetail,
  search,
  getDailyInspiration,
  addBookmark,
  getBookmarks,
  removeBookmark,
  addHighlight,
  getHighlights,
  updateLastRead,
  getLastRead,
  getAyah,
  getVersion,
  checkSync,
  downloadSync
};
