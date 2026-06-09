import { Prisma } from '@prisma/client';
import { RecetaResponseDto } from './dto/receta-response.dto';
import {
  mapMascotaToResumen,
  mascotaInclude,
} from '../common/mappers/mascota.mapper';
import {
  mapMedicoToResumen,
  medicoInclude,
} from '../common/mappers/medico.mapper';
import {
  mapSucursalToResumen,
  sucursalInclude,
} from '../common/mappers/sucursal.mapper';

export const recetaInclude = {
  detalles: true,
  cita: {
    include: {
      mascota: { include: mascotaInclude },
      medico: { include: medicoInclude },
      sucursal: sucursalInclude,
    },
  },
} as const satisfies Prisma.RecetaInclude;

export type RecetaWithRelations = Prisma.RecetaGetPayload<{
  include: typeof recetaInclude;
}>;

export function mapRecetaToResponse(
  receta: RecetaWithRelations,
): RecetaResponseDto {
  return {
    id: receta.id,
    diagnostico: receta.diagnostico,
    observaciones: receta.observaciones,
    fechaReceta: receta.fechaReceta,
    detalles: receta.detalles.map((d) => ({
      id: d.id,
      medicamento: d.medicamento,
      dosis: d.dosis,
      frecuencia: d.frecuencia,
      duracion: d.duracion,
      viaAdministracion: d.viaAdministracion,
      instrucciones: d.instrucciones,
    })),
    cita: {
      id: receta.cita.id,
      fecha: receta.cita.fecha,
      horaInicio: receta.cita.horaInicio,
      horaFin: receta.cita.horaFin,
      mascota: mapMascotaToResumen(receta.cita.mascota),
      medico: mapMedicoToResumen(receta.cita.medico),
      sucursal: mapSucursalToResumen(receta.cita.sucursal),
    },
  };
}
