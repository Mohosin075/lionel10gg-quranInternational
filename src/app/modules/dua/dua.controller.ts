import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { DuaService } from './dua.service';

const getAllDuas = catchAsync(async (req: Request, res: Response) => {
  const lang = req.query.lang as string || 'en';
  const category = req.query.category as string;
  const result = await DuaService.getAllDuas(lang, category);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Duas fetched successfully',
    data: result,
  });
});

const getDuaById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await DuaService.getDuaById(id);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Dua fetched successfully',
    data: result,
  });
});

const createDua = catchAsync(async (req: Request, res: Response) => {
  const result = await DuaService.createDua(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Dua created successfully',
    data: result,
  });
});

const getVersion = catchAsync(async (req: Request, res: Response) => {
  const lang = req.query.lang as string || 'en';
  const result = await DuaService.getVersion(lang);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Version fetched successfully',
    data: { lang, version: result },
  });
});

const checkSync = catchAsync(async (req: Request, res: Response) => {
  const lang = req.query.lang as string || 'en';
  const { version } = req.query;
  const result = await DuaService.checkSyncMetadata(lang, Number(version) || 0);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Sync status checked successfully',
    data: result,
  });
});

const downloadSync = catchAsync(async (req: Request, res: Response) => {
  const lang = req.query.lang as string || 'en';
  const { fromVersion } = req.query;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;

  const result = await DuaService.getSyncData(lang, Number(fromVersion) || 0);

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

const syncDuas = catchAsync(async (req: Request, res: Response) => {
  const result = await DuaService.syncEnglishDuas();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Duas synchronized successfully',
    data: result,
  });
});

export const DuaController = {
  getAllDuas,
  getDuaById,
  createDua,
  getVersion,
  checkSync,
  downloadSync,
  syncDuas,
};
