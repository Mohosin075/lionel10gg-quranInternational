import { Schema, model } from 'mongoose';
import { IBookmark } from './bookmark.interface';

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

// Ensuring unique bookmarks per user-ayah
BookmarkSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });

export const Bookmark = model<IBookmark>('Bookmark', BookmarkSchema);
