import { Schema, model } from 'mongoose';
import { ITranslation, ILanguage } from './quran.interface';

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

const LanguageSchema = new Schema<ILanguage>(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    language: { type: String, required: true },
    iso: { type: String },
    full_language_name: { type: String },
    author: { type: String },
    source: { type: String, enum: ['quranenc', 'qurancom'], required: true },
    isSynced: { type: Boolean, default: false },
    lastSyncedAt: { type: Date },
  },
  { timestamps: true }
);

export const Language = model<ILanguage>('Language', LanguageSchema);
