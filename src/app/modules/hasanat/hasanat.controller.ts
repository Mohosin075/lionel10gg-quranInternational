import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { HasanatService } from './hasanat.service';

const collectHasanat = catchAsync(async (req: Request, res: Response) => {
  const userId = (req as any).user?._id;
  const { amount } = req.body;

  const result = await HasanatService.collectHasanat(userId, amount);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Hasanat collected successfully',
    data: {
      totalHasanat: result.totalHasanat,
    },
  });
});

export const HasanatController = {
  collectHasanat,
};
