import { Schema, model } from 'mongoose';
import { IDua } from './dua.interface';

const DuaSchema = new Schema<IDua>(
  {
    externalId: { type: String },
    title: { type: String, required: true },
    arabic: { type: String, required: true },
    translation: { type: String, required: true },
    transliteration: { type: String },
    category: { type: String, required: true },
    audio: { type: String },
    repeat: { type: Number, default: 1 },
    reference: { type: String },
    lang: { type: String, required: true, default: 'en' },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

DuaSchema.index({ lang: 1, category: 1 });
DuaSchema.index({ externalId: 1, lang: 1 }, { unique: true, sparse: true });

export const Dua = model<IDua>('Dua', DuaSchema);
