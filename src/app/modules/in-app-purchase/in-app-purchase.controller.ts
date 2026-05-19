import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { inAppPurchaseService } from './in-app-purchase.service';
import { JwtPayload } from 'jsonwebtoken';

const getAvailablePlans = catchAsync(async (req: Request, res: Response) => {
  const plans = await inAppPurchaseService.getAvailablePlans();

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'InAppPurchase plans retrieved successfully',
    data: plans,
  });
});

const getPlanById = catchAsync(async (req: Request, res: Response) => {
  const { planId } = req.params;

  const plan = await inAppPurchaseService.getPlanById(planId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'InAppPurchase plan retrieved successfully',
    data: plan,
  });
});

const verifyPurchase = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const userId = user.authId!.toString();

  const purchase = await inAppPurchaseService.verifyPurchase(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Purchase verified successfully',
    data: purchase,
  });
});

const getUserPurchases = catchAsync(async (req: Request, res: Response) => {
  const user = req.user as JwtPayload;
  const userId = user.authId!.toString();

  const purchases = await inAppPurchaseService.getUserPurchases(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Purchases retrieved successfully',
    data: purchases,
  });
});

export const InAppPurchaseController = {
  getAvailablePlans,
  getPlanById,
  verifyPurchase,
  getUserPurchases
};
