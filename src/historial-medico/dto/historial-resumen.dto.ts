import { MascotaInfoDto } from './mascota-info.dto';
import { PropietarioInfoDto } from './propietario-info.dto';
import { CitaResumenDto } from './cita-resumen.dto';
import { PesoHistorialItemDto } from './peso-historial.dto';

export interface HistorialResumenDto {
  mascota: MascotaInfoDto;
  agregados: {
    frecuenciaCardiacaPromedio: number | null;
    ultimaVisita: Date | null;
    proximaVisita: Date | null;
  };
  proximasCitas: CitaResumenDto[];
  ultimasCitas: CitaResumenDto[];
  pesoActual: number | null;
  pesoHistorial: PesoHistorialItemDto[];
  propietario?: PropietarioInfoDto;
}
