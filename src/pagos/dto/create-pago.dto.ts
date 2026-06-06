import { z } from 'zod';

export const CreatePagoDto = z.object({
  folioPago: z.string().regex(/^VET-\d{8}-\d{4}$/, {
    message: 'folioPago debe tener formato VET-YYYYMMDD-XXXX',
  }),
});

export type CreatePagoDto = z.infer<typeof CreatePagoDto>;
