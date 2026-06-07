import { z } from 'zod';

export const adminFiltrosSchema = z
  .object({
    mascotaId: z.string().uuid().optional(),
    usuarioId: z.string().uuid().optional(),
    medicoId: z.string().uuid().optional(),
    fechaDesde: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    fechaHasta: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    cursor: z.string().optional(),
    limit: z
      .string()
      .transform((val) => {
        const n = parseInt(val, 10);
        return isNaN(n) ? 20 : Math.min(Math.max(n, 1), 100);
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.fechaDesde && data.fechaHasta) {
        return data.fechaDesde <= data.fechaHasta;
      }
      return true;
    },
    {
      message: 'fechaDesde must be before or equal to fechaHasta',
      path: ['fechaDesde'],
    },
  );

export type AdminFiltrosDto = z.infer<typeof adminFiltrosSchema>;
