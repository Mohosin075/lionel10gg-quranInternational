import { Schema, model } from 'mongoose';
import { ITafsir } from './tafsir.interface';

const TafsirSchema = new Schema<ITafsir>(
  {
    surah: { type: Number, required: true },
    ayah: { type: Number, required: true },
    lang: { type: String, required: true },
    edition: { type: String, required: true },
    text: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true }
);

TafsirSchema.index(
  { surah: 1, ayah: 1, lang: 1, edition: 1 },
  { unique: true }
);

export const Tafsir = model<ITafsir>('Tafsir', TafsirSchema);
