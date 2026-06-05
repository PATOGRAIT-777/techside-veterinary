import { z } from 'zod';

export const UpdateCitaDto = z
  .object({
    sucursalId: z.string().uuid().optional(),
    medicoId: z.string().uuid().optional(),
    consultorioId: z.string().uuid().optional(),
    servicioId: z.string().uuid().optional(),
    fecha: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    horaInicio: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    motivo: z.string().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type UpdateCitaDto = z.infer<typeof UpdateCitaDto>;
