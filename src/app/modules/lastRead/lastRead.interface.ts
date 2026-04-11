import { Types } from 'mongoose';

export interface ILastRead {
  user: Types.ObjectId;
  surahNumber: number;
  ayahNumber: number;
  editionIdentifier: string;
  updatedAt?: Date;
}
