import { Schema, model } from 'mongoose';

export interface IOfflinePack {
  module: string;
  lang: string;
  version: number;
  sha256: string;
  packSizeMb: number;
  s3Key: string;
  recordCount: number;
  generatedAt: Date;
}

const OfflinePackSchema = new Schema<IOfflinePack>(
  {
    module: { type: String, required: true },
    lang: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    sha256: { type: String, required: true },
    packSizeMb: { type: Number, required: true },
    s3Key: { type: String, required: true },
    recordCount: { type: Number, required: true, default: 0 },
    generatedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true },
);

// One pack metadata record per module+lang (latest version only)
OfflinePackSchema.index({ module: 1, lang: 1 }, { unique: true });

export const OfflinePack = model<IOfflinePack>('OfflinePack', OfflinePackSchema);
