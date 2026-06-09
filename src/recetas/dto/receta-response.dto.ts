import { MascotaResumenDto } from '../../common/dto/mascota-resumen.dto';
import { MedicoResumenDto } from '../../common/dto/medico-resumen.dto';
import { SucursalResumenDto } from '../../common/dto/sucursal-resumen.dto';

export interface DetalleRecetaDto {
  id: string;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracion: string;
  viaAdministracion: string;
  instrucciones: string | null;
}

export interface CitaResumenRecetaDto {
  id: string;
  fecha: Date;
  horaInicio: Date;
  horaFin: Date;
  mascota: MascotaResumenDto;
  medico: MedicoResumenDto;
  sucursal: SucursalResumenDto;
}

export interface RecetaResponseDto {
  id: string;
  diagnostico: string;
  observaciones: string | null;
  fechaReceta: Date;
  detalles: DetalleRecetaDto[];
  cita: CitaResumenRecetaDto;
}
