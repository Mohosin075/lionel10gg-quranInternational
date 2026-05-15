import { z } from 'zod'

export const PaymentValidations = {
  create: z.object({
    body: z.object({
      amount: z.number({
        required_error: 'Amount is required',
      }).min(1, 'Amount must be at least 1'),
      currency: z.string().default('USD'),
      paymentType: z.enum(['one_time', 'subscription']).default('one_time'),
      productName: z.string().optional(),
      description: z.string().optional(),
    }),
  }),

  update: z.object({
    body: z
      .object({
        status: z.enum(['succeeded', 'failed', 'refunded']).optional(),
        refundAmount: z.number().min(0).optional(),
        refundReason: z.string().optional(),
      })
      .strict(),
  }),

  webhook: z.object({
    body: z.object({
      type: z.string(),
      data: z.object({
        object: z.object({
          id: z.string(),
          status: z.string(),
          amount: z.number(),
          currency: z.string(),
          metadata: z.any().optional(),
        }),
      }),
    }),
  }),
}
