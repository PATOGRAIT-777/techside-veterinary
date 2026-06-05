import { z } from 'zod';

export const CreateConsultaDto = z.object({
  citaId: z.string().uuid({ message: 'La cita es obligatoria' }),
  peso: z.number().positive().optional(),
  temperatura: z.number().positive().optional(),
  frecuenciaCardiaca: z.number().int().positive().optional(),
  frecuenciaRespiratoria: z.number().int().positive().optional(),
  presionArterial: z.string().max(20).optional(),
  estadoGeneral: z.string().max(500).optional(),
  notasEvolucion: z.string().max(2000).optional(),
});

export type CreateConsultaDto = z.infer<typeof CreateConsultaDto>;
