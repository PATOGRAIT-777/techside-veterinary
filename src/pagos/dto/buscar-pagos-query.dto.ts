import { z } from 'zod';
import { EstadoPago } from '@prisma/client';

export const buscarPagosQuerySchema = z.object({
  estado: z.nativeEnum(EstadoPago).optional(),
  limit: z
    .string()
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(parseInt(v, 10)), {
      message: 'El parámetro de paginación no es válido.',
    })
    .transform((v) => {
      const n = parseInt(v ?? '20', 10);
      return Math.min(Math.max(n, 1), 100);
    }),
  offset: z
    .string()
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(parseInt(v, 10)), {
      message: 'El parámetro de paginación no es válido.',
    })
    .transform((v) => Math.max(parseInt(v ?? '0', 10), 0)),
});

export type BuscarPagosQueryDto = z.infer<typeof buscarPagosQuerySchema>;
