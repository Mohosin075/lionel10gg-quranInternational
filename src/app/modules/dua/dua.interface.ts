export interface IDua {
  externalId?: string;
  title: string;
  arabic: string;
  translation: string;
  transliteration?: string;
  category: string;
  audio?: string;
  repeat?: number;
  reference?: string;
  lang: string;
  version: number;
}
