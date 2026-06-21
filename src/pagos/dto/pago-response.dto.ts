import { EstadoCita, EstadoPago, Prisma } from '@prisma/client';

export interface PagoResponseDto {
  id: string;
  folioPago: string;
  cantidad: number;
  estado: EstadoPago;
  fechaPago: Date | null;
  createdAt: Date;
  updatedAt: Date;
  cita: {
    id: string;
    estado: EstadoCita;
    fecha: Date;
    horaInicio: Date;
    mascota: {
      id: string;
      nombre: string;
    };
    servicio: {
      id: string;
      nombre: string;
    };
    sucursal: {
      id: string;
      nombre: string;
    };
    medico: {
      id: string;
      nombreCompleto: string;
    };
  };
}

export interface PaginatedPagosResponseDto {
  data: PagoResponseDto[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
}

export const pagoInclude = {
  cita: {
    include: {
      mascota: { select: { id: true, nombre: true, propietarioId: true } },
      servicio: { select: { id: true, nombre: true } },
      sucursal: { select: { id: true, nombre: true } },
      medico: {
        select: {
          id: true,
          usuarioId: true,
          usuario: {
            select: {
              persona: { select: { nombreCompleto: true } },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.PagoInclude;

export type PagoWithRelations = Prisma.PagoGetPayload<{
  include: typeof pagoInclude;
}>;

export function mapPagoToResponse(pago: PagoWithRelations): PagoResponseDto {
  return {
    id: pago.id,
    folioPago: pago.folioPago,
    cantidad: Number(pago.cantidad),
    estado: pago.estado,
    fechaPago: pago.fechaPago ?? null,
    createdAt: pago.createdAt,
    updatedAt: pago.updatedAt,
    cita: {
      id: pago.cita.id,
      estado: pago.cita.estado,
      fecha: pago.cita.fecha,
      horaInicio: pago.cita.horaInicio,
      mascota: pago.cita.mascota,
      servicio: pago.cita.servicio,
      sucursal: pago.cita.sucursal,
      medico: {
        id: pago.cita.medico.id,
        nombreCompleto: pago.cita.medico.usuario?.persona?.nombreCompleto ?? '',
      },
    },
  };
}
