import { EstadoCita } from '@prisma/client';
import { MascotaResumenDto } from './mascota-resumen.dto';
import { MedicoResumenDto } from './medico-resumen.dto';
import { SucursalResumenDto } from './sucursal-resumen.dto';

export interface CitaResumenDto {
  id: string;
  fecha: Date;
  horaInicio: Date;
  horaFin: Date;
  estado: EstadoCita;
  motivo: string | null;
  sucursal: SucursalResumenDto;
  medico: MedicoResumenDto;
  mascota: MascotaResumenDto;
}
