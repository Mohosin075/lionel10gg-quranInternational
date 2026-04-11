import { z } from 'zod';

const updateLastReadSchema = z.object({
  body: z.object({
    surahNumber: z.number({ required_error: 'Surah number is required' }),
    ayahNumber: z.number({ required_error: 'Ayah number is required' }),
    editionIdentifier: z.string().optional(),
  }),
});

export const LastReadValidations = {
  updateLastReadSchema,
};
