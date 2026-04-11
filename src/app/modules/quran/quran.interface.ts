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

export interface ITranslation {
  surah: number;
  ayah: number;
  language: string;
  edition: string;
  text: string;
  version: number;
  updatedAt?: Date;
}

// QuranEnc Response Interfaces
export interface IQuranEncTranslationInfo {
  id: number;
  translation_key: string;
  language_name: string;
  language_id: string;
  version: number;
}

export interface IQuranEncAyah {
  id: string;
  sura: string;
  aya: string;
  translation: string;
  footnotes: string;
}

export interface IQuranEncSurahResponse {
  result: IQuranEncAyah[];
}
