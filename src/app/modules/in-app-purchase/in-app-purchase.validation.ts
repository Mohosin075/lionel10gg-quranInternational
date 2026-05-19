import { z } from 'zod';

const verifyPurchase = z.object({
  body: z.object({
    planId: z.string({
      required_error: 'Plan ID is required',
    }),
    platform: z.enum(['ios', 'android'], {
      required_error: 'Platform is required',
    }),
    receiptData: z.string({
      required_error: 'Receipt data is required',
    }),
    productId: z.string({
      required_error: 'Product ID is required',
    }),
  }),
});

export const inAppPurchaseValidation = {
  verifyPurchase,
};
