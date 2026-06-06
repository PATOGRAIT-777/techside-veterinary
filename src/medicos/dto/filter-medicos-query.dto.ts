import { z } from 'zod';

export const FilterMedicosQueryDto = z.object({
  especialidadId: z.string().uuid().optional(),
  sucursalId: z.string().uuid().optional(),
});

export type FilterMedicosQueryDto = z.infer<typeof FilterMedicosQueryDto>;
