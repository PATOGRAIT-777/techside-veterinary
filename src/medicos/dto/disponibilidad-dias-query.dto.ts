import { z } from 'zod';

export const DisponibilidadDiasQueryDto = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type DisponibilidadDiasQueryDto = z.infer<
  typeof DisponibilidadDiasQueryDto
>;
