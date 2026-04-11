import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Bookmark } from './bookmark.model';
import { IBookmark } from './bookmark.interface';

const addBookmark = async (payload: IBookmark) => {
  const result = await Bookmark.findOneAndUpdate(
    { user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber },
    payload,
    { upsert: true, new: true }
  );
  return result;
};

const getBookmarks = async (userId: string) => {
  return await Bookmark.find({ user: userId }).sort({ createdAt: -1 });
};

const removeBookmark = async (id: string, userId: string) => {
  const result = await Bookmark.findOneAndDelete({ _id: id, user: userId });
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Bookmark not found');
  }
  return result;
};

export const BookmarkServices = {
  addBookmark,
  getBookmarks,
  removeBookmark,
};
