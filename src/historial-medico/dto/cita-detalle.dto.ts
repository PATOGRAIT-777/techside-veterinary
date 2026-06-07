import { EstadoCita } from '@prisma/client';
import { RecetaDetalleDto } from './receta-detalle.dto';
import { ConsultaDetalleDto } from './consulta-detalle.dto';
import { PagoDetalleDto } from './pago-detalle.dto';

export interface CitaDetalleDto {
  id: string;
  estado: EstadoCita;
  especialidad: string;
  medico: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  sucursal: string;
  motivo: string | null;
  receta: RecetaDetalleDto | null;
  consulta: ConsultaDetalleDto | null;
  pago: PagoDetalleDto | null;
}
