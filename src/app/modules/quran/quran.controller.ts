import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { QuranServices } from './quran.service';

const getLanguages = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 200;
  const lang = req.query.lang as string;
  const localization = req.query.localization as string || 'en';
  
  const result = await QuranServices.fetchLanguages(page, limit, lang, localization);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Languages fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSurahs = catchAsync(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  
  const result = await QuranServices.fetchSurahs(page, limit);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Surahs fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSurahDetail = catchAsync(async (req: Request, res: Response) => {
  const { number } = req.params;
  const edition = req.query.edition as string || 'english_saheeh';
  const lang = req.query.lang as string || 'en';
  const result = await QuranServices.getSurahDetail(Number(number), edition, lang);
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

const syncLanguages = catchAsync(async (req: Request, res: Response) => {
  const { edition } = req.query;
  
  if (edition) {
    // Sync specific edition in background
    QuranServices.syncEdition(edition as string);
    sendResponse(res, {
      statusCode: StatusCodes.ACCEPTED,
      success: true,
      message: `Sync started for edition: ${edition}`,
    });
  } else {
    // Sync all editions in background
    QuranServices.syncAll();
    sendResponse(res, {
      statusCode: StatusCodes.ACCEPTED,
      success: true,
      message: 'Sync started for all editions',
    });
  }
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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    
    const result = await QuranServices.getSyncData(edition as string, Number(fromVersion) || 0);
    
    // Manual pagination for sync data since it's an array from DB
    const total = result.length;
    const skip = (page - 1) * limit;
    const paginatedData = result.slice(skip, skip + limit);

    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Sync data fetched successfully',
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        },
        data: paginatedData,
    });
});

export const QuranController = {
  getLanguages,
  getSurahs,
  getSurahDetail,
  search,
  getDailyInspiration,
  getAyah,
  getVersion,
  syncLanguages,
  checkSync,
  downloadSync
};
