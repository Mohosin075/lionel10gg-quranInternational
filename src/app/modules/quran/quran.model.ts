import { Schema, model } from 'mongoose';
import { IBookmark, IHighlight, ILastRead, ITranslation } from './quran.interface';

const BookmarkSchema = new Schema<IBookmark>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    surahNumber: { type: Number, required: true },
    ayahNumber: { type: Number, required: true },
    text: { type: String },
    translation: { type: String },
    editionIdentifier: { type: String, default: 'en.sahih' },
  },
  { timestamps: true }
);

const HighlightSchema = new Schema<IHighlight>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    surahNumber: { type: Number, required: true },
    ayahNumber: { type: Number, required: true },
    color: { type: String, required: true },
    text: { type: String },
  },
  { timestamps: true }
);

const LastReadSchema = new Schema<ILastRead>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    surahNumber: { type: Number, required: true },
    ayahNumber: { type: Number, required: true },
    editionIdentifier: { type: String, default: 'en.sahih' },
  },
  { timestamps: true }
);

const TranslationSchema = new Schema<ITranslation>(
  {
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    language: { type: String, required: true },
    edition: { type: String, required: true },
    text: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

// Ensuring unique bookmarks per user-ayah
BookmarkSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
HighlightSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
LastReadSchema.index({ user: 1 }, { unique: true }); // Only one last read record per user

// Critical index for Translation
TranslationSchema.index(
  { surah: 1, ayah: 1, language: 1, edition: 1 },
  { unique: true }
);

// Text index for search
TranslationSchema.index({ text: 'text' });

export const Bookmark = model<IBookmark>('Bookmark', BookmarkSchema);
export const Highlight = model<IHighlight>('Highlight', HighlightSchema);
export const LastRead = model<ILastRead>('LastRead', LastReadSchema);
export const Translation = model<ITranslation>('Translation', TranslationSchema);
