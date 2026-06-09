import { Prisma } from '@prisma/client';
import { MedicoResumenDto } from '../dto/medico-resumen.dto';

export const medicoInclude = {
  usuario: {
    include: {
      persona: { select: { id: true, nombreCompleto: true } },
    },
  },
  especialidadPrincipal: { select: { id: true, nombre: true } },
} as const satisfies Prisma.MedicoInclude;

export type MedicoWithRelations = Prisma.MedicoGetPayload<{
  include: typeof medicoInclude;
}>;

export function mapMedicoToResumen(
  medico: MedicoWithRelations,
): MedicoResumenDto {
  return {
    id: medico.id,
    nombreCompleto: medico.usuario?.persona?.nombreCompleto ?? '',
    especialidad: medico.especialidadPrincipal?.nombre ?? '',
  };
}
