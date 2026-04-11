import { Types } from 'mongoose';

export interface IBookmark {
  user: Types.ObjectId;
  surahNumber: number;
  ayahNumber: number;
  text?: string;
  translation?: string;
  editionIdentifier: string;
}
