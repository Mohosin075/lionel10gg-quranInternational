import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { LastRead } from './lastRead.model';
import { ILastRead } from './lastRead.interface';

const updateLastRead = async (payload: ILastRead) => {
  const result = await LastRead.findOneAndUpdate(
    { user: payload.user },
    payload,
    { upsert: true, new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to update last read');
  }

  return result;
};

const getLastRead = async (userId: string) => {
  const result = await LastRead.findOne({ user: userId });
  return result;
};

export const LastReadServices = {
  updateLastRead,
  getLastRead,
};
