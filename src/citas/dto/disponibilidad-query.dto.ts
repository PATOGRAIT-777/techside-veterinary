import { z } from 'zod';

export const DisponibilidadQueryDto = z.object({
  medicoId: z.string().uuid({ message: 'El médico es obligatorio' }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  }),
});

export type DisponibilidadQueryDto = z.infer<typeof DisponibilidadQueryDto>;
