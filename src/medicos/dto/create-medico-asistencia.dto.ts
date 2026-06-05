import { z } from 'zod';

export const CreateMedicoAsistenciaDto = z.object({
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Formato YYYY-MM-DD' }),
  horaEntradaReal: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  horaSalidaReal: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  estado: z.enum(
    ['asistencia', 'falta', 'retardo', 'justificado', 'incapacidad'],
    {
      message: 'Estado de asistencia no válido',
    },
  ),
  observaciones: z.string().max(1000).optional(),
});

export type CreateMedicoAsistenciaDto = z.infer<
  typeof CreateMedicoAsistenciaDto
>;
