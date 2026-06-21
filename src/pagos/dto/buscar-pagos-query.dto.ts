import { z } from 'zod';
import { EstadoPago } from '@prisma/client';

export const DEFAULT_PAGE_LIMIT = 20;
export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_OFFSET = 0;

function paginationInt(
  value: string | undefined,
  defaultValue: number,
  min: number,
  max?: number,
): number {
  const n = parseInt(value ?? String(defaultValue), 10);
  if (Number.isNaN(n)) return defaultValue;
  const clampedMin = Math.max(n, min);
  return max === undefined ? clampedMin : Math.min(clampedMin, max);
}

export const buscarPagosQuerySchema = z.object({
  estado: z.nativeEnum(EstadoPago).optional(),
  limit: z
    .string()
    .optional()
    .refine((v) => v === undefined || /^-?\d+$/.test(v), {
      message: 'El parámetro de paginación no es válido.',
    })
    .transform((v) => paginationInt(v, DEFAULT_PAGE_LIMIT, 1, MAX_PAGE_LIMIT)),
  offset: z
    .string()
    .optional()
    .refine((v) => v === undefined || /^-?\d+$/.test(v), {
      message: 'El parámetro de paginación no es válido.',
    })
    .transform((v) => paginationInt(v, DEFAULT_OFFSET, DEFAULT_OFFSET)),
});

export type BuscarPagosQueryDto = z.infer<typeof buscarPagosQuerySchema>;
