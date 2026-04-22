import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { INotification } from './notification.interface';
import { Notification } from './notification.model';
import { io } from '../../../server';

const createNotification = async (payload: Partial<INotification>): Promise<INotification> => {
  const result = await Notification.create(payload);

  // Send real-time notification via socket
  if (io && result.userId) {
    io.to(result.userId.toString()).emit('notification', {
      type: 'NEW_NOTIFICATION',
      data: result,
    });
  }

  return result;
};

const getMyNotifications = async (userId: string): Promise<INotification[]> => {
  const result = await Notification.find({ userId }).sort({ createdAt: -1 });
  return result;
};

const markAsRead = async (id: string, userId: string): Promise<INotification | null> => {
  const result = await Notification.findOneAndUpdate(
    { _id: id, userId },
    { isRead: true },
    { new: true }
  );
  return result;
};

const markAllAsRead = async (userId: string) => {
  const result = await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  return result;
};

const deleteNotification = async (id: string, userId: string) => {
  const result = await Notification.findOneAndDelete({ _id: id, userId });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }
  return result;
};

export const NotificationServices = {
  createNotification,
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
