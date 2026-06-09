import { MascotaResumenDto } from '../../common/dto/mascota-resumen.dto';
import { MedicoResumenDto } from '../../common/dto/medico-resumen.dto';
import { SucursalResumenDto } from '../../common/dto/sucursal-resumen.dto';

export interface CitaResumenConsultaDto {
  id: string;
  fecha: Date;
  horaInicio: Date;
  horaFin: Date;
  mascota: MascotaResumenDto;
  medico: MedicoResumenDto;
  sucursal: SucursalResumenDto;
}

export interface ConsultaResponseDto {
  id: string;
  peso: string | null;
  temperatura: string | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  presionArterial: string | null;
  estadoGeneral: string | null;
  notasEvolucion: string | null;
  cita: CitaResumenConsultaDto;
}
