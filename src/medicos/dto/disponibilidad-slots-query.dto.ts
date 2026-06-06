import { z } from 'zod';

export const DisponibilidadSlotsQueryDto = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type DisponibilidadSlotsQueryDto = z.infer<
  typeof DisponibilidadSlotsQueryDto
>;
