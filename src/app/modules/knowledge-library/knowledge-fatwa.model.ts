import { Schema, model } from 'mongoose';
import { IKnowledgeFatwa } from './knowledge-library.interface';

const KnowledgeFatwaSchema = new Schema<IKnowledgeFatwa>(
  {
    fatwaId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true }, // HTML formatted text
    scholar: { type: String },
    lang: { type: String, required: true, default: 'de' },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

KnowledgeFatwaSchema.index({ fatwaId: 1, lang: 1 }, { unique: true });
KnowledgeFatwaSchema.index({ isActive: 1 });

export const KnowledgeFatwa = model<IKnowledgeFatwa>(
  'KnowledgeFatwa',
  KnowledgeFatwaSchema
);
