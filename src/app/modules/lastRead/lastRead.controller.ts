import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LastReadServices } from './lastRead.service';
import { JwtPayload } from 'jsonwebtoken';

const updateLastRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await LastReadServices.updateLastRead({ ...req.body, user: user.authId });
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Last read updated successfully',
    data: result,
  });
});

const getLastRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await LastReadServices.getLastRead(user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Last read fetched successfully',
    data: result,
  });
});

export const LastReadController = {
  updateLastRead,
  getLastRead,
};
