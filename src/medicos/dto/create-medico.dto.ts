import { z } from 'zod';

export const CreateMedicoDto = z.object({
  usuarioId: z.string().uuid({ message: 'El usuario es obligatorio' }),
  sucursalId: z.string().uuid().optional(),
  especialidadPrincipalId: z.string().uuid().optional(),
  cedulaProfesional: z.string().max(50).optional(),
  biografiaCorta: z.string().max(1000).optional(),
});

export type CreateMedicoDto = z.infer<typeof CreateMedicoDto>;
