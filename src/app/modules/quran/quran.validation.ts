import { z } from 'zod';

const bookmarkValidationSchema = z.object({
  body: z.object({
    surahNumber: z.number({ required_error: 'Surah number is required' }),
    ayahNumber: z.number({ required_error: 'Ayah number is required' }),
    text: z.string().optional(),
    translation: z.string().optional(),
    editionIdentifier: z.string().optional(),
  }),
});

const highlightValidationSchema = z.object({
  body: z.object({
    surahNumber: z.number({ required_error: 'Surah number is required' }),
    ayahNumber: z.number({ required_error: 'Ayah number is required' }),
    color: z.string({ required_error: 'Color is required' }),
    text: z.string().optional(),
  }),
});

const lastReadValidationSchema = z.object({
  body: z.object({
    surahNumber: z.number({ required_error: 'Surah number is required' }),
    ayahNumber: z.number({ required_error: 'Ayah number is required' }),
    editionIdentifier: z.string().optional(),
  }),
});

const getSurahDetailValidationSchema = z.object({
  params: z.object({
    number: z.string().regex(/^\d+$/, 'Surah number must be a digit'),
  }),
  query: z.object({
    edition: z.string().optional(),
  }),
});

const getAyahValidationSchema = z.object({
  params: z.object({
    surah: z.string().regex(/^\d+$/, 'Surah number must be a digit'),
    ayah: z.string().regex(/^\d+$/, 'Ayah number must be a digit'),
  }),
  query: z.object({
    edition: z.string().optional(),
    lang: z.string().optional(),
  }),
});

const checkSyncValidationSchema = z.object({
  query: z.object({
    edition: z.string({ required_error: 'Edition is required' }),
    version: z.string().regex(/^\d+$/, 'Version must be a digit').optional(),
  }),
});

const downloadSyncValidationSchema = z.object({
  query: z.object({
    edition: z.string({ required_error: 'Edition is required' }),
    fromVersion: z.string().regex(/^\d+$/, 'fromVersion must be a digit').optional(),
  }),
});

export const QuranValidations = {
  bookmarkValidationSchema,
  highlightValidationSchema,
  lastReadValidationSchema,
  getSurahDetailValidationSchema,
  getAyahValidationSchema,
  checkSyncValidationSchema,
  downloadSyncValidationSchema,
};
