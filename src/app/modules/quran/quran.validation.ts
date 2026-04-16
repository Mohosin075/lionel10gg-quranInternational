import { z } from 'zod';

const getSurahDetailValidationSchema = z.object({
  params: z.object({
    number: z.string().regex(/^\d+$/, 'Surah number must be a digit'),
  }),
  query: z.object({
    edition: z.string().optional(),
    lang: z.string().optional(),
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
  getSurahDetailValidationSchema,
  getAyahValidationSchema,
  checkSyncValidationSchema,
  downloadSyncValidationSchema,
};
