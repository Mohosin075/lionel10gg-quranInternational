import { z } from 'zod'

const createBenefitZodSchema = z.object({
  body: z.object({
    serialNumber: z.number({ required_error: 'Serial number is required' }),
    text: z.string({ required_error: 'Feature text is required' }),
    defaultLanguage: z
      .string()
      .regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/)
      .optional(),
    translations: z
      .record(
        z.string().regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/),
        z.string().min(1).max(2000),
      )
      .optional(),
    isActive: z.boolean().optional(),
  }),
})

const updateBenefitZodSchema = z.object({
  body: z.object({
    serialNumber: z.number().optional(),
    text: z.string().optional(),
    defaultLanguage: z
      .string()
      .regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/)
      .optional(),
    translations: z
      .record(
        z.string().regex(/^[a-z]{2,3}(-[a-zA-Z]+)?$/),
        z.string().min(1).max(2000),
      )
      .optional(),
    isActive: z.boolean().optional(),
  }),
})

export const SubscriptionBenefitValidations = {
  createBenefitZodSchema,
  updateBenefitZodSchema,
}
