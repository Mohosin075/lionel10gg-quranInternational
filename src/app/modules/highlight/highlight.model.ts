import { Schema, model } from 'mongoose';
import { IHighlight } from './highlight.interface';

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

HighlightSchema.index({ user: 1, surahNumber: 1, ayahNumber: 1 }, { unique: true });

export const Highlight = model<IHighlight>('Highlight', HighlightSchema);
