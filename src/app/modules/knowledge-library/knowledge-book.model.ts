import { Schema, model } from 'mongoose';
import { IKnowledgeBook } from './knowledge-library.interface';

const KnowledgeBookSchema = new Schema<IKnowledgeBook>(
  {
    bookId: { type: String, required: true },
    title: { type: String, required: true },
    author: { type: String },
    content: { type: String, required: true }, // Rich Text HTML/Formatted string
    lang: { type: String, required: true, default: 'de' },
    source: { type: String, enum: ['islamhouse', 'manual'], required: true, default: 'manual' },
    version: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

KnowledgeBookSchema.index({ bookId: 1, lang: 1 }, { unique: true });
KnowledgeBookSchema.index({ version: 1, lang: 1 });

export const KnowledgeBook = model<IKnowledgeBook>(
  'KnowledgeBook',
  KnowledgeBookSchema
);
