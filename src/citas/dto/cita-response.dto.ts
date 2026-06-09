import { EstadoCita, EstadoPago } from '@prisma/client';
import { MascotaResumenDto } from '../../common/dto/mascota-resumen.dto';
import { MedicoResumenDto } from '../../common/dto/medico-resumen.dto';
import { SucursalResumenDto } from '../../common/dto/sucursal-resumen.dto';

export interface ServicioResumenDto {
  id: string;
  nombre: string;
}

export interface PagoResumenDto {
  id: string;
  folioPago: string;
  cantidad: string;
  estado: EstadoPago;
  fechaPago: Date | null;
}

export interface CitaResponseDto {
  id: string;
  fecha: Date;
  horaInicio: Date;
  horaFin: Date;
  estado: EstadoCita;
  motivo: string | null;
  sucursal: SucursalResumenDto;
  medico: MedicoResumenDto;
  mascota: MascotaResumenDto;
  servicio: ServicioResumenDto;
  pago: PagoResumenDto | null;
  receta: { id: string } | null;
  consulta: { id: string } | null;
}
