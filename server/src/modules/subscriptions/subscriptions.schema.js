import { z } from 'zod';

export const createCheckoutSchema = z.object({
  priceId: z.string().min(1, 'priceId é obrigatório'),
  successUrl: z.string().url('successUrl deve ser uma URL válida'),
  cancelUrl: z.string().url('cancelUrl deve ser uma URL válida'),
});

export const webhookSchema = z.object({
  stripeSignature: z.string().min(1),
  rawBody: z.any(),
});
