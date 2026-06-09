import { Prisma } from '@prisma/client';
import { ConsultaResponseDto } from './dto/consulta-response.dto';
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

export const consultaInclude = {
  cita: {
    include: {
      mascota: { include: mascotaInclude },
      medico: { include: medicoInclude },
      sucursal: sucursalInclude,
    },
  },
} as const satisfies Prisma.ConsultaInclude;

export type ConsultaWithRelations = Prisma.ConsultaGetPayload<{
  include: typeof consultaInclude;
}>;

export function mapConsultaToResponse(
  consulta: ConsultaWithRelations,
): ConsultaResponseDto {
  return {
    id: consulta.id,
    peso: consulta.peso ? consulta.peso.toString() : null,
    temperatura: consulta.temperatura ? consulta.temperatura.toString() : null,
    frecuenciaCardiaca: consulta.frecuenciaCardiaca ?? null,
    frecuenciaRespiratoria: consulta.frecuenciaRespiratoria ?? null,
    presionArterial: consulta.presionArterial ?? null,
    estadoGeneral: consulta.estadoGeneral ?? null,
    notasEvolucion: consulta.notasEvolucion ?? null,
    cita: {
      id: consulta.cita.id,
      fecha: consulta.cita.fecha,
      horaInicio: consulta.cita.horaInicio,
      horaFin: consulta.cita.horaFin,
      mascota: mapMascotaToResumen(consulta.cita.mascota),
      medico: mapMedicoToResumen(consulta.cita.medico),
      sucursal: mapSucursalToResumen(consulta.cita.sucursal),
    },
  };
}
