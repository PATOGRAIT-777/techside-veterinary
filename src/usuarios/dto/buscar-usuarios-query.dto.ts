import { z } from 'zod';
import { Rol } from '@prisma/client';

export const buscarUsuariosQuerySchema = z.object({
  search: z
    .string()
    .max(100, 'La búsqueda no puede exceder 100 caracteres')
    .optional(),
  rol: z
    .enum([Rol.cliente, Rol.medico, Rol.admin], {
      message: 'El rol proporcionado no es válido.',
    })
    .optional(),
  limit: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (v === undefined) return true;
        return !Number.isNaN(parseInt(v, 10));
      },
      { message: 'El parámetro de paginación no es válido.' },
    )
    .transform((v) => {
      const n = parseInt(v ?? '20', 10);
      return Math.min(Math.max(n, 1), 100);
    }),
  offset: z
    .string()
    .optional()
    .refine(
      (v) => {
        if (v === undefined) return true;
        return !Number.isNaN(parseInt(v, 10));
      },
      { message: 'El parámetro de paginación no es válido.' },
    )
    .transform((v) => {
      const n = parseInt(v ?? '0', 10);
      return Math.max(n, 0);
    }),
});

export type BuscarUsuariosQueryDto = z.infer<typeof buscarUsuariosQuerySchema>;
