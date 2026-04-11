import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { HighlightServices } from './highlight.service';
import { JwtPayload } from 'jsonwebtoken';

const addHighlight = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await HighlightServices.addHighlight({ ...req.body, user });
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Highlight added successfully',
    data: result,
  });
});

const getHighlights = catchAsync(async (req: Request, res: Response) => {
  const user = (req.user as JwtPayload).authId;
  const result = await HighlightServices.getHighlights(user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Highlights fetched successfully',
    data: result,
  });
});

export const HighlightControllers = {
  addHighlight,
  getHighlights,
};
