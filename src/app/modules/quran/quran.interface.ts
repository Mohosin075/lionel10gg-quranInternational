
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
  lang: string;
  edition: string;
  arabicText?: string;
  text: string;
  footnotes?: string;
  version: number;
  updatedAt?: Date;
}

export interface ILanguage {
  key: string;
  name: string;
  language: string;
  iso?: string;
  full_language_name?: string;
  author: string;
  source: 'quranenc' | 'qurancom';
  isSynced: boolean;
  lastSyncedAt?: Date;
}

// QuranEnc Response Interfaces
export interface IQuranEncTranslationInfo {
  key: string;
  language_iso_code: string;
  version: string;
  last_update: string;
  title: string;
  description: string;
}

export interface IQuranEncAyah {
  id: string;
  sura: string;
  aya: string;
  arabic_text: string;
  translation: string;
  footnotes: string;
}

export interface IQuranEncSurahResponse {
  result: IQuranEncAyah[];
}

export interface IQuranEncTranslationsListResponse {
  translations: IQuranEncTranslationInfo[];
}

// Quran.com Response Interfaces
export interface IQuranComTranslationInfo {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: {
    name: string;
    language_name: string;
  };
}

export interface IQuranComVerse {
  id: number;
  verse_key: string;
  verse_number: number;
  text_uthmani?: string;
  translations: {
    id: number;
    resource_id: number;
    text: string;
  }[];
}

export interface IQuranComChapterResponse {
  verses: IQuranComVerse[];
}
