import { z } from 'zod';

const createBookmarkSchema = z.object({
  body: z.object({
    surahNumber: z.number({ required_error: 'Surah number is required' }),
    ayahNumber: z.number({ required_error: 'Ayah number is required' }),
    text: z.string().optional(),
    translation: z.string().optional(),
    editionIdentifier: z.string().optional(),
  }),
});

export const BookmarkValidations = {
  createBookmarkSchema,
};
