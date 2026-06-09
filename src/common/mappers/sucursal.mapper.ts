import { Prisma } from '@prisma/client';
import { SucursalResumenDto } from '../dto/sucursal-resumen.dto';

export const sucursalInclude = {
  select: { id: true, nombre: true },
} as const;

export type SucursalPayload = Prisma.SucursalGetPayload<typeof sucursalInclude>;

export function mapSucursalToResumen(
  sucursal: SucursalPayload,
): SucursalResumenDto {
  return {
    id: sucursal.id,
    nombre: sucursal.nombre,
  };
}
