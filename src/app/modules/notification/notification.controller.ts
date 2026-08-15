import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { NotificationServices } from './notification.service';
import { JwtPayload } from 'jsonwebtoken';
import { User } from '../user/user.model';
import { Notification } from './notification.model';
import { io } from '../../../server';

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await NotificationServices.getMyNotifications(user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notifications fetched successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const { id } = req.params;
  const result = await NotificationServices.markAsRead(id, user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const result = await NotificationServices.markAllAsRead(user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'All notifications marked as read',
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const { id } = req.params;
  const result = await NotificationServices.deleteNotification(id, user.authId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notification deleted successfully',
    data: result,
  });
});

const sendAdminNotification = catchAsync(async (req: Request, res: Response) => {
  const { title, message, userId } = req.body;
  let result;
  if (userId) {
    result = await NotificationServices.createNotification({ userId, title, message });
  } else {
    // Broadcast to all users
    const users = await User.find({ status: 'active' }).select('_id');
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
    }));
    result = await Notification.insertMany(notifications);
    if (io) {
      io.emit('notification', {
        type: 'NEW_NOTIFICATION',
        data: { title, message },
      });
    }
  }
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Notification sent successfully',
    data: result,
  });
});

export const NotificationController = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendAdminNotification,
};
