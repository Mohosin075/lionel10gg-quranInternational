import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AppConfigService } from './app-config.service';

const getAppConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await AppConfigService.getAppConfig();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'App configuration fetched successfully',
    data: result,
  });
});

const updateAppConfig = catchAsync(async (req: Request, res: Response) => {
  const result = await AppConfigService.updateAppConfig(req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'App configuration updated successfully',
    data: result,
  });
});

export const AppConfigController = {
  getAppConfig,
  updateAppConfig,
};
