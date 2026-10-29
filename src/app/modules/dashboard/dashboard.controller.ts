import ApiError from '../../../errors/ApiError'
import type { ReportRange } from './report-range'
import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { DashboardService } from './dashboard.service'

const getAnalytics = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getAnalytics()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Analytics data retrieved successfully',
    data: result,
  })
})

const getUserManagement = catchAsync(async (req: Request, res: Response) => {
  const result = await DashboardService.getUserManagement()
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'User management data retrieved successfully',
    data: result,
  })
})

const getNotificationManagement = catchAsync(
  async (req: Request, res: Response) => {
    const result = await DashboardService.getNotificationManagement()
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: 'Notification management data retrieved successfully',
      data: result,
    })
  },
)

const getReports = catchAsync(async (req: Request, res: Response) => {
  const range = req.query.range ?? '7d'
  if (typeof range !== 'string' || !['7d', '30d', 'month'].includes(range)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid report date range')
  }
  const result = await DashboardService.getReports(range as ReportRange)
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Reports data retrieved successfully',
    data: result,
  })
})

export const DashboardController = {
  getAnalytics,
  getUserManagement,
  getNotificationManagement,
  getReports,
}
