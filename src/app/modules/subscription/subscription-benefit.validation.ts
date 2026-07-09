import { z } from 'zod';

const createBenefitZodSchema = z.object({
  body: z.object({
    serialNumber: z.number({ required_error: 'Serial number is required' }),
    text: z.string({ required_error: 'Feature text is required' }),
    isActive: z.boolean().optional(),
  }),
});

const updateBenefitZodSchema = z.object({
  body: z.object({
    serialNumber: z.number().optional(),
    text: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const SubscriptionBenefitValidations = {
  createBenefitZodSchema,
  updateBenefitZodSchema,
};
