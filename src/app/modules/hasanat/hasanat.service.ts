import { User } from '../user/user.model';
import ApiError from '../../../errors/ApiError';
import { StatusCodes } from 'http-status-codes';

const collectHasanat = async (userId: string, amount: number) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const hasanatAmount = Number(amount);
  if (isNaN(hasanatAmount)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid amount');
  }

  user.totalHasanat = (user.totalHasanat || 0) + hasanatAmount;
  await user.save();

  return user;
};

export const HasanatService = {
  collectHasanat,
};
