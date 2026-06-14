import { z } from 'zod';

const createHadithZodSchema = z.object({
  body: z.object({
    hadithNo: z.string({ required_error: 'hadithNo is required' }),
    source: z.string({ required_error: 'source is required' }),
    chapter: z.string({ required_error: 'chapter is required' }),
    arabicText: z.string({ required_error: 'arabicText is required' }),
    translation: z.string({ required_error: 'translation is required' }),
    authenticity: z.string().optional(),
    category: z.string({ required_error: 'category is required' }),
    lang: z.string().optional(),
    version: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

const updateHadithZodSchema = z.object({
  body: z.object({
    hadithNo: z.string().optional(),
    source: z.string().optional(),
    chapter: z.string().optional(),
    arabicText: z.string().optional(),
    translation: z.string().optional(),
    authenticity: z.string().optional(),
    category: z.string().optional(),
    lang: z.string().optional(),
    version: z.number().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const HadithValidations = {
  createHadithZodSchema,
  updateHadithZodSchema,
};
