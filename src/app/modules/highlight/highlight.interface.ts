import { Types } from 'mongoose';

export interface IHighlight {
  user: Types.ObjectId;
  surahNumber: number;
  ayahNumber: number;
  color: string; // Hex color or name
  text?: string;
}
