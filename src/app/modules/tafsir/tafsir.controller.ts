import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TafsirService } from './tafsir.service';

const getTafsir = catchAsync(async (req: Request, res: Response) => {
  const { surah, ayah } = req.params;
  const edition = req.query.edition as string || 'arabic_moyassar';
  const lang = req.query.lang as string || 'ar';

  const result = await TafsirService.getTafsir(Number(surah), Number(ayah), edition, lang);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Tafsir fetched successfully',
    data: result,
  });
});

const getSurahTafsir = catchAsync(async (req: Request, res: Response) => {
  const { surah } = req.params;
  const edition = req.query.edition as string || 'arabic_moyassar';
  const lang = req.query.lang as string || 'ar';

  const result = await TafsirService.getSurahTafsir(Number(surah), edition, lang);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Surah Tafsir fetched successfully',
    data: result,
  });
});

const getVersion = catchAsync(async (req: Request, res: Response) => {
  const { edition } = req.query;
  const result = await TafsirService.getTranslationVersion(edition as string);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Version fetched successfully',
    data: { edition, version: result },
  });
});

const checkSync = catchAsync(async (req: Request, res: Response) => {
  const { edition, version } = req.query;
  const result = await TafsirService.checkSyncMetadata(edition as string, Number(version) || 0);
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

  const result = await TafsirService.getSyncData(edition as string, Number(fromVersion) || 0);

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

export const TafsirController = {
  getTafsir,
  getSurahTafsir,
  getVersion,
  checkSync,
  downloadSync,
};
