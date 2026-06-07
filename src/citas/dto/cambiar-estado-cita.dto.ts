import { z } from 'zod';

export const CambiarEstadoCitaDto = z.object({
  estado: z.enum(['pendiente', 'en_curso', 'inasistencia', 'cancelada'], {
    message:
      'Estado de cita no válido. No se permite cambiar directamente a pendiente_de_pago ni completada',
  }),
});

export type CambiarEstadoCitaDto = z.infer<typeof CambiarEstadoCitaDto>;
