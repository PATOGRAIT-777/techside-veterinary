import { z } from 'zod';

export const CreateCitaDto = z.object({
  emailUsuario: z.string().email().optional(),
  sucursalId: z.string().uuid({ message: 'La sucursal es obligatoria' }),
  medicoId: z.string().uuid({ message: 'El médico es obligatorio' }),
  mascotaId: z.string().uuid({ message: 'La mascota es obligatoria' }),
  servicioId: z.string().uuid({ message: 'El servicio es obligatorio' }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha debe tener formato YYYY-MM-DD',
  }),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'La hora debe tener formato HH:MM',
  }),
  motivo: z
    .string()
    .max(500, 'El motivo no puede exceder 500 caracteres')
    .optional(),
});

export type CreateCitaDto = z.infer<typeof CreateCitaDto>;
