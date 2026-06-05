import { z } from 'zod';
import { DetalleRecetaDto } from './detalle-receta.dto';

export const CreateRecetaDto = z.object({
  citaId: z.string().uuid({ message: 'La cita es obligatoria' }),
  diagnostico: z
    .string()
    .min(1, 'El diagnóstico es obligatorio')
    .max(2000, 'Máximo 2000 caracteres'),
  observaciones: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
  detalles: z
    .array(DetalleRecetaDto)
    .min(1, 'Debe incluir al menos un medicamento')
    .max(20, 'Máximo 20 medicamentos por receta'),
});

export type CreateRecetaDto = z.infer<typeof CreateRecetaDto>;
