import { z } from 'zod';

export const CambiarEstadoCitaDto = z.object({
  estado: z.enum(
    ['pendiente', 'en_curso', 'inasistencia', 'completada', 'cancelada'],
    {
      message: 'Estado de cita no válido',
    },
  ),
});

export type CambiarEstadoCitaDto = z.infer<typeof CambiarEstadoCitaDto>;
