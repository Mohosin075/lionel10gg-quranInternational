import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const collectHasanat = async (userId: string, amount: number) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  user.totalHasanat = (user.totalHasanat || 0) + amount;
  await user.save();

  return user;
};

export const HasanatService = {
  collectHasanat,
};
