import { EstadoPago } from '@prisma/client';

export interface PagoDetalleDto {
  folioPago: string;
  cantidad: number;
  estado: EstadoPago;
  fechaPago: Date | null;
}
