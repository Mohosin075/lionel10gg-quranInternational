import { z } from 'zod';

const collectHasanatZodSchema = z.object({
  body: z.object({
    amount: z.number({
      required_error: 'Amount is required',
    }).positive('Amount must be a positive number'),
  }),
});

export const HasanatValidation = {
  collectHasanatZodSchema,
};
