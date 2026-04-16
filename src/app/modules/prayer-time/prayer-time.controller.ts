import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { PrayerTimeServices } from './prayer-time.service';
import { JwtPayload } from 'jsonwebtoken';

const getMyPrayerTimes = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const authId = user?.authId;
  
  const settings = await PrayerTimeServices.getPrayerSettings(authId);
  
  const prayerTimes = await PrayerTimeServices.getPrayerTimes(
    settings.location.city,
    settings.location.country,
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Prayer times fetched successfully',
    data: {
      timings: prayerTimes,
      settings,
    },
  });
});

const getAdhanRecitations = catchAsync(async (req: Request, res: Response) => {
  const result = PrayerTimeServices.getAdhanRecitations();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Adhan recitations fetched successfully',
    data: result,
  });
});

const updateSettings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await PrayerTimeServices.updatePrayerSettings(
    user.authId,
    req.body,
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Prayer settings updated successfully',
    data: result,
  });
});

export const PrayerTimeControllers = {
  getMyPrayerTimes,
  getAdhanRecitations,
  updateSettings,
};
