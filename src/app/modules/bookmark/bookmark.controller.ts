import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { BookmarkServices } from './bookmark.service';
import { JwtPayload } from 'jsonwebtoken';

const addBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await BookmarkServices.addBookmark({ ...req.body, user: user.authId });
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: 'Bookmark added successfully',
    data: result,
  });
});

const getBookmarks = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await BookmarkServices.getBookmarks(user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Bookmarks fetched successfully',
    data: result,
  });
});

const removeBookmark = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const { id } = req.params;
  const result = await BookmarkServices.removeBookmark(id, user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Bookmark removed successfully',
    data: result,
  });
});

export const BookmarkController = {
  addBookmark,
  getBookmarks,
  removeBookmark,
};
