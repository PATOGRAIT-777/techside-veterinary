import { z } from 'zod';

export const citasPasadasQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional(),
});

export type CitasPasadasQueryDto = z.infer<typeof citasPasadasQuerySchema>;
