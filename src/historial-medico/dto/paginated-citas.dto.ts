import { CitaResumenDto } from './cita-resumen.dto';

export interface PaginatedCitasDto {
  data: CitaResumenDto[];
  meta: {
    nextCursor: string | null;
    limit: number;
    hasMore: boolean;
  };
}
