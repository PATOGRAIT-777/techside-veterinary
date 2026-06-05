import { z } from 'zod';

export const DetalleRecetaDto = z.object({
  medicamento: z
    .string()
    .min(1, 'El medicamento es obligatorio')
    .max(500, 'Máximo 500 caracteres'),
  dosis: z
    .string()
    .min(1, 'La dosis es obligatoria')
    .max(255, 'Máximo 255 caracteres'),
  frecuencia: z
    .string()
    .min(1, 'La frecuencia es obligatoria')
    .max(255, 'Máximo 255 caracteres'),
  duracion: z
    .string()
    .min(1, 'La duración es obligatoria')
    .max(255, 'Máximo 255 caracteres'),
  viaAdministracion: z
    .string()
    .min(1, 'La vía de administración es obligatoria')
    .max(255, 'Máximo 255 caracteres'),
  instrucciones: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
});

export type DetalleRecetaDto = z.infer<typeof DetalleRecetaDto>;
