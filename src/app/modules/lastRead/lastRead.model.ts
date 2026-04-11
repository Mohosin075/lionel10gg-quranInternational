import { Schema, model } from 'mongoose';
import { ILastRead } from './lastRead.interface';

const LastReadSchema = new Schema<ILastRead>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    surahNumber: { type: Number, required: true },
    ayahNumber: { type: Number, required: true },
    editionIdentifier: { type: String, default: 'en.sahih' },
  },
  { timestamps: true }
);

LastReadSchema.index({ user: 1 }, { unique: true }); // Only one last read record per user

export const LastRead = model<ILastRead>('LastRead', LastReadSchema);
