import { z } from 'zod';
import { crearMascotaSchema } from './crear-mascota.dto';

export const actualizarMascotaSchema = crearMascotaSchema.partial();

export type ActualizarMascotaDto = z.infer<typeof actualizarMascotaSchema>;
