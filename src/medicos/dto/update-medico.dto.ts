import { z } from 'zod';

export const UpdateMedicoDto = z
  .object({
    sucursalId: z.string().uuid().optional(),
    especialidadPrincipalId: z.string().uuid().optional(),
    cedulaProfesional: z.string().max(50).optional(),
    biografiaCorta: z.string().max(1000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Debe proporcionar al menos un campo para actualizar',
  });

export type UpdateMedicoDto = z.infer<typeof UpdateMedicoDto>;
