import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { S3Helper } from '../../../helpers/image/s3helper'
import sendResponse from '../../../shared/sendResponse'

export const UploadController = {
  // POST /upload/presign
  async presign(req: Request, res: Response) {
    try {
      const { filename, contentType, folder = 'videos' } = req.body
      if (!filename || !contentType) {
        return sendResponse(res, {
          statusCode: StatusCodes.BAD_REQUEST,
          success: false,
          message: 'filename and contentType required',
        })
      }

      const result = await S3Helper.generatePresignedUploadUrl(
        filename,
        folder,
        contentType,
        3600,
      )

      return sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: 'Presigned URL generated',
        data: result,
      })
    } catch (err: unknown) {
      console.error('Presign error:', err)
      const status =
        err && typeof err === 'object' && 'status' in err
          ? ((err as Record<string, unknown>).status as number)
          : StatusCodes.INTERNAL_SERVER_ERROR
      return sendResponse(res, {
        statusCode: status,
        success: false,
        message: (err as Error)?.message || 'Failed to get presigned URL',
      })
    }
  },
}

export default UploadController
