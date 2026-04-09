import { Types } from 'mongoose';

export interface IQuranEdition {
  identifier: string;
  language: string;
  name: string;
  englishName: string;
  format: string;
  type: string;
  direction: string | null;
}

export interface ISurahMetadata {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface ISajda {
  id: number;
  recommended: boolean;
  obligatory: boolean;
}

export interface IAyah {
  number: number;
  text: string;
  numberInSurah: number;
  juz: number;
  manzil: number;
  page: number;
  ruku: number;
  hizbQuarter: number;
  sajda: boolean | ISajda;
}

export interface IBookmark {
  user: Types.ObjectId;
  surahNumber: number;
  ayahNumber: number;
  text?: string;
  translation?: string;
  editionIdentifier: string;
}

export interface IHighlight {
  user: Types.ObjectId;
  surahNumber: number;
  ayahNumber: number;
  color: string; // Hex color or name
  text?: string;
}

export interface ILastRead {
  user: Types.ObjectId;
  surahNumber: number;
  ayahNumber: number;
  editionIdentifier: string;
  updatedAt?: Date;
}
