import { EstadoCita, EstadoPago } from '@prisma/client';

export interface CitaResumenDto {
  id: string;
  estado: EstadoCita;
  especialidad: string;
  medico: string;
  fecha: Date;
  horaInicio: string;
  horaFin?: string;
  sucursal?: string;
  motivo?: string | null;
  estadoPago?: EstadoPago | null;
}
