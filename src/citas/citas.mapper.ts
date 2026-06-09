import { Prisma } from '@prisma/client';
import { CitaResponseDto } from './dto/cita-response.dto';
import { mapMascotaToResumen } from '../common/mappers/mascota.mapper';
import { mapMedicoToResumen } from '../common/mappers/medico.mapper';
import {
  mapSucursalToResumen,
  sucursalInclude,
} from '../common/mappers/sucursal.mapper';
import { mascotaInclude } from '../common/mappers/mascota.mapper';

export const citaInclude = {
  sucursal: sucursalInclude,
  medico: {
    include: {
      usuario: {
        include: {
          persona: { select: { id: true, nombreCompleto: true } },
        },
      },
      especialidadPrincipal: { select: { id: true, nombre: true } },
    },
  },
  mascota: { include: mascotaInclude },
  servicio: true,
  pago: true,
  receta: { select: { id: true } },
  consulta: { select: { id: true } },
} as const satisfies Prisma.CitaInclude;

export type CitaWithRelations = Prisma.CitaGetPayload<{
  include: typeof citaInclude;
}>;

export function mapCitaToResponse(cita: CitaWithRelations): CitaResponseDto {
  return {
    id: cita.id,
    fecha: cita.fecha,
    horaInicio: cita.horaInicio,
    horaFin: cita.horaFin,
    estado: cita.estado,
    motivo: cita.motivo,
    sucursal: mapSucursalToResumen(cita.sucursal),
    medico: mapMedicoToResumen(cita.medico),
    mascota: mapMascotaToResumen(cita.mascota),
    servicio: { id: cita.servicio.id, nombre: cita.servicio.nombre },
    pago: cita.pago
      ? {
          id: cita.pago.id,
          folioPago: cita.pago.folioPago,
          cantidad: cita.pago.cantidad.toString(),
          estado: cita.pago.estado,
          fechaPago: cita.pago.fechaPago ?? null,
        }
      : null,
    receta: cita.receta ? { id: cita.receta.id } : null,
    consulta: cita.consulta ? { id: cita.consulta.id } : null,
  };
}
