import { z } from 'zod';

const createSheikhContentZodSchema = z.object({
  body: z.object({
    speakerName: z.string({ required_error: 'Speaker name is required' }),
    type: z.enum(['video', 'audio_travel'], { required_error: 'Type must be video or audio_travel' }),
    title: z.string({ required_error: 'Title is required' }),
    url: z.string({ required_error: 'URL is required' }).url('Invalid URL format'),
    isActive: z.boolean().optional(),
  }),
});

const updateSheikhContentZodSchema = z.object({
  body: z.object({
    speakerName: z.string().optional(),
    type: z.enum(['video', 'audio_travel']).optional(),
    title: z.string().optional(),
    url: z.string().url('Invalid URL format').optional(),
    isActive: z.boolean().optional(),
  }),
});

export const SheikhContentValidations = {
  createSheikhContentZodSchema,
  updateSheikhContentZodSchema,
};
