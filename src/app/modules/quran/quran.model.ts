import { Schema, model } from 'mongoose';
import { ITranslation } from './quran.interface';

const TranslationSchema = new Schema<ITranslation>(
  {
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    lang: { type: String, required: true },
    edition: { type: String, required: true },
    arabicText: { type: String },
    text: { type: String, required: true },
    footnotes: { type: String },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

// Critical index for Translation
TranslationSchema.index(
  { surah: 1, ayah: 1, lang: 1, edition: 1 },
  { unique: true }
);

// Text index for search
TranslationSchema.index({ text: 'text' });

export const Translation = model<ITranslation>('Translation', TranslationSchema);
