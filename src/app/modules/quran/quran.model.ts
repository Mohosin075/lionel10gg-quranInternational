import { Schema, model } from 'mongoose';
import { IBookmark, IHighlight, ILastRead } from './quran.interface';

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

// Ensuring unique bookmarks per user-ayah
BookmarkSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
HighlightSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });
LastReadSchema.index({ user: 1 }, { unique: true }); // Only one last read record per user

export const Bookmark = model<IBookmark>('Bookmark', BookmarkSchema);
export const Highlight = model<IHighlight>('Highlight', HighlightSchema);
export const LastRead = model<ILastRead>('LastRead', LastReadSchema);
