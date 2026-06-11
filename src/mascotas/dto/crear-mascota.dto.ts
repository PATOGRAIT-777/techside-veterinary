import { z } from 'zod';

export const crearMascotaSchema = z.object({
  nombre: z.string().min(1).max(100),
  razaId: z.string().uuid('Debe ser un UUID válido').optional(),
  colorId: z.string().uuid('Debe ser un UUID válido').optional(),
  tipoPeloId: z.string().uuid('Debe ser un UUID válido').optional(),
  patronPeloId: z.string().uuid('Debe ser un UUID válido').optional(),
  comportamientoId: z.string().uuid('Debe ser un UUID válido').optional(),
  fechaNacimiento: z.string().datetime().optional(),
  sexo: z.enum(['Macho', 'Hembra']).optional(),
  peso: z.number().positive().optional(),
  esterilizado: z.boolean().optional(),
  ruac: z.string().max(50).optional(),
  microchip: z.string().max(100).nullable().optional(),
  tatuaje: z.string().max(100).optional(),
  observaciones: z.string().max(2000).optional(),
  alergiaIds: z.array(z.string().uuid('Debe ser un UUID válido')).optional(),
  propietarioId: z.string().uuid('Debe ser un UUID válido').optional(),
});

export type CrearMascotaDto = z.infer<typeof crearMascotaSchema>;
