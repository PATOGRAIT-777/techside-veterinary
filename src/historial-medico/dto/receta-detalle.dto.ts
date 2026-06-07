import { DetalleRecetaDto } from './detalle-receta.dto';

export interface RecetaDetalleDto {
  diagnostico: string;
  observaciones: string | null;
  fechaReceta: Date;
  detalles: DetalleRecetaDto[];
}
