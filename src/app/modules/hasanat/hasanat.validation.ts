import { z } from 'zod'

const collectHasanatZodSchema = z.object({
  body: z.object({
    amount: z
      .number({
        required_error: 'Amount is required',
      })
      .int()
      .positive('Amount must be a positive number')
      .max(10000000),
  }),
})

export const HasanatValidation = {
  collectHasanatZodSchema,
}
