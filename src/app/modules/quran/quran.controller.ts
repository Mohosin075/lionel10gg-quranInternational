import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { QuranServices } from './quran.service';

const getEditions = catchAsync(async (req: Request, res: Response) => {
  const type = req.query.type as string;
  const result = await QuranServices.fetchEditions(type);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Editions fetched successfully',
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
  const edition = req.query.edition as string;
  const result = await QuranServices.fetchSurahDetail(Number(number), edition);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Surah detail fetched successfully',
    data: result,
  });
});

const getJuz = catchAsync(async (req: Request, res: Response) => {
  const { number } = req.params;
  const edition = req.query.edition as string;
  const result = await QuranServices.fetchJuz(Number(number), edition);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Juz fetched successfully',
    data: result,
  });
});

const search = catchAsync(async (req: Request, res: Response) => {
  const keyword = req.query.keyword as string;
  const edition = req.query.edition as string;
  const result = await QuranServices.searchQuran(keyword, edition);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Search results fetched successfully',
    data: result,
  });
});

const getDailyInspiration = catchAsync(async (req: Request, res: Response) => {
  const edition = req.query.edition as string;
  const result = await QuranServices.getDailyInspiration(edition);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Daily inspiration fetched successfully',
    data: result,
  });
});

const addBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = req.user._id;
  const result = await QuranServices.addBookmark({ ...req.body, user });
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Bookmark added successfully',
    data: result,
  });
});

const getBookmarks = catchAsync(async (req: Request, res: Response) => {
  const user = req.user._id;
  const result = await QuranServices.getBookmarks(user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Bookmarks fetched successfully',
    data: result,
  });
});

const removeBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = req.user._id;
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
    const user = req.user._id;
    const result = await QuranServices.addHighlight({ ...req.body, user });
    sendResponse(res, {
      statusCode: StatusCodes.CREATED,
      success: true,
      message: 'Highlight added successfully',
      data: result,
    });
  });
  
  const getHighlights = catchAsync(async (req: Request, res: Response) => {
    const user = req.user._id;
    const result = await QuranServices.getHighlights(user);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Highlights fetched successfully',
      data: result,
    });
  });

const updateLastRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user._id;
  const result = await QuranServices.updateLastRead({ ...req.body, user });
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Last read updated successfully',
    data: result,
  });
});

const getLastRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user._id;
  const result = await QuranServices.getLastRead(user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Last read fetched successfully',
    data: result,
  });
});

export const QuranControllers = {
  getEditions,
  getSurahs,
  getSurahDetail,
  getJuz,
  search,
  getDailyInspiration,
  addBookmark,
  getBookmarks,
  removeBookmark,
  addHighlight,
  getHighlights,
  updateLastRead,
  getLastRead,
};
