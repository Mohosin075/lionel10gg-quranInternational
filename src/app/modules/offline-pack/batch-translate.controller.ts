import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { BatchTranslateService } from './batch-translate.service';
import { SupportedModule } from './offline-pack.service';

// POST /offline-pack/batch-translate
// Body: { module: "hadith", targetLang: "de" }
const startBatchTranslation = catchAsync(async (req: Request, res: Response) => {
  const module = (req.body.module || 'hadith') as SupportedModule;
  const targetLang = req.body.targetLang as string;

  if (!targetLang) throw new Error('targetLang is required');

  const result = await BatchTranslateService.createBatchJob(module, targetLang);

  sendResponse(res, {
    statusCode: StatusCodes.ACCEPTED,
    success: true,
    message: `OpenAI Batch translation job started. Poll /batch-status/${result.jobId} to track progress.`,
    data: result,
  });
});

// GET /offline-pack/batch-status/:jobId
const getBatchStatus = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const result = await BatchTranslateService.checkBatchStatus(jobId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: 'Batch job status fetched',
    data: result,
  });
});

// POST /offline-pack/batch-process/:jobId
// Call this once status is "completed" to save results to MongoDB
const processBatchResult = catchAsync(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const result = await BatchTranslateService.processBatchResult(jobId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `Batch results processed and saved to MongoDB`,
    data: result,
  });
});

export const BatchController = {
  startBatchTranslation,
  getBatchStatus,
  processBatchResult,
};
