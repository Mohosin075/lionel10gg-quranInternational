import { Schema, model } from 'mongoose';
import { IDua } from './dua.interface';

const DuaSchema = new Schema<IDua>(
  {
    title: { type: String, required: true },
    arabic: { type: String, required: true },
    translation: { type: String, required: true },
    transliteration: { type: String },
    category: { type: String, required: true },
    audio: { type: String },
    reference: { type: String },
    lang: { type: String, required: true, default: 'en' },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

DuaSchema.index({ lang: 1, category: 1 });

export const Dua = model<IDua>('Dua', DuaSchema);
