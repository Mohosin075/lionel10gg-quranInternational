import { Schema, model } from 'mongoose';

export interface IBatchJob {
  batchId: string;
  fileId: string;
  module: string;
  targetLang: string;
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'processed';
  recordCount: number;
  processedCount: number;
  outputFileId?: string;
  errorFileId?: string;
}

const BatchJobSchema = new Schema<IBatchJob>(
  {
    batchId: { type: String, required: true, unique: true },
    fileId: { type: String, required: true },
    module: { type: String, required: true },
    targetLang: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ['in_progress', 'completed', 'failed', 'cancelled', 'processed'],
      default: 'in_progress',
    },
    recordCount: { type: Number, required: true, default: 0 },
    processedCount: { type: Number, required: true, default: 0 },
    outputFileId: { type: String },
    errorFileId: { type: String },
  },
  { timestamps: true },
);

BatchJobSchema.index({ module: 1, targetLang: 1 });
BatchJobSchema.index({ status: 1 });

export const BatchJob = model<IBatchJob>('BatchJob', BatchJobSchema);
