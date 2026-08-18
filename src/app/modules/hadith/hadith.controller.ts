import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { HadithServices } from './hadith.service';

const getAllHadiths = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'en';
  const category = req.query.category as string;
  const source = req.query.source as string;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await HadithServices.getAllHadiths(lang, category, source, page, limit);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadiths fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getHadithById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await HadithServices.getHadithById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadith fetched successfully',
    data: result,
  });
});

const createHadith = catchAsync(async (req: Request, res: Response) => {
  const result = await HadithServices.createHadith(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Hadith created successfully',
    data: result,
  });
});

const updateHadith = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await HadithServices.updateHadith(id, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadith updated successfully',
    data: result,
  });
});

const deleteHadith = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await HadithServices.deleteHadith(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadith deleted successfully',
    data: result,
  });
});

const getVersion = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'en';
  const result = await HadithServices.getVersion(lang);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadith version fetched successfully',
    data: { lang, version: result },
  });
});

const checkSync = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'en';
  const { version } = req.query;
  const result = await HadithServices.checkSyncMetadata(lang, Number(version) || 0);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadith sync status checked successfully',
    data: result,
  });
});

const downloadSync = catchAsync(async (req: Request, res: Response) => {
  const lang = (req.query.lang as string) || 'en';
  const { fromVersion } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 500;

  const result = await HadithServices.getSyncData(
    lang,
    Number(fromVersion) || 0,
    page,
    limit,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadith sync data fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const syncFromGlobalApi = catchAsync(async (req: Request, res: Response) => {
  const edition = (req.body.edition as string) || 'eng-bukhari';
  const fromHadith = Number(req.body.from) || 1;
  const toHadith = Number(req.body.to) || 10;

  const result = await HadithServices.syncFromGlobalApi(edition, fromHadith, toHadith);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hadiths synced from global API successfully',
    data: result,
  });
});

export const HadithController = {
  getAllHadiths,
  getHadithById,
  createHadith,
  updateHadith,
  deleteHadith,
  getVersion,
  checkSync,
  downloadSync,
  syncFromGlobalApi,
};
