import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Highlight } from './highlight.model';
import { IHighlight } from './highlight.interface';

const addHighlight = async (payload: IHighlight) => {
  const result = await Highlight.findOneAndUpdate(
    { user: payload.user, surahNumber: payload.surahNumber, ayahNumber: payload.ayahNumber },
    payload,
    { upsert: true, new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to add highlight');
  }

  return result;
};

const getHighlights = async (userId: string) => {
  const result = await Highlight.find({ user: userId }).sort({ createdAt: -1 });
  return result;
};

export const HighlightServices = {
  addHighlight,
  getHighlights,
};
