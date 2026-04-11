import { z } from 'zod';

const createHighlightSchema = z.object({
  body: z.object({
    surahNumber: z.number({ required_error: 'Surah number is required' }),
    ayahNumber: z.number({ required_error: 'Ayah number is required' }),
    color: z.string({ required_error: 'Color is required' }),
    text: z.string().optional(),
  }),
});

export const HighlightValidations = {
  createHighlightSchema,
};
