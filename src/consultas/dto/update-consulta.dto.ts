import { z } from 'zod';

export const UpdateConsultaDto = z
  .object({
    peso: z.number().positive().optional(),
    temperatura: z.number().positive().optional(),
    frecuenciaCardiaca: z.number().int().positive().optional(),
    frecuenciaRespiratoria: z.number().int().positive().optional(),
    presionArterial: z.string().max(20).optional(),
    estadoGeneral: z.string().max(500).optional(),
    notasEvolucion: z.string().max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type UpdateConsultaDto = z.infer<typeof UpdateConsultaDto>;
