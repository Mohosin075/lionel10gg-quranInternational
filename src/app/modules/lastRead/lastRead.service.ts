import { LastRead } from './lastRead.model';
import { ILastRead } from './lastRead.interface';

const updateLastRead = async (payload: ILastRead) => {
  const result = await LastRead.findOneAndUpdate(
    { user: payload.user },
    payload,
    { upsert: true, new: true }
  );
  return result;
};

const getLastRead = async (userId: string) => {
  return await LastRead.findOne({ user: userId });
};

export const LastReadServices = {
  updateLastRead,
  getLastRead,
};
