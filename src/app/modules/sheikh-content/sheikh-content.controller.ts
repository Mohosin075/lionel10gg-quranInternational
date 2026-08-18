import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { SheikhContentServices } from './sheikh-content.service';

const createContent = catchAsync(async (req: Request, res: Response) => {
  const result = await SheikhContentServices.createContent(req.body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Sheikh content created successfully',
    data: result,
  });
});

const updateContent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SheikhContentServices.updateContent(id, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Sheikh content updated successfully',
    data: result,
  });
});

const deleteContent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await SheikhContentServices.deleteContent(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Sheikh content deleted successfully',
    data: result,
  });
});

const getSpeakerContent = catchAsync(async (req: Request, res: Response) => {
  const speakerName = (req.query.speakerName as string) || 'Abu Alia';
  const continuation = (req.query.continuation as string) || '';

  const result = continuation
    ? await SheikhContentServices.getMoreSpeakerVideos(speakerName, continuation)
    : await SheikhContentServices.getSpeakerContent(speakerName);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: continuation
      ? 'More sheikh videos fetched successfully'
      : 'Sheikh content fetched successfully',
    data: result,
  });
});

const getAllContents = catchAsync(async (req: Request, res: Response) => {
  const result = await SheikhContentServices.getAllContents();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'All sheikh contents fetched successfully',
    data: result,
  });
});

export const SheikhContentController = {
  createContent,
  updateContent,
  deleteContent,
  getSpeakerContent,
  getAllContents,
};
