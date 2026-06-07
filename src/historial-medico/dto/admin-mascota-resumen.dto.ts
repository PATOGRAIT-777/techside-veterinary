export interface AdminMascotaResumenDto {
  mascotaId: string;
  mascotaNombre: string;
  propietarioNombre: string;
  propietarioEmail: string;
  ultimaCitaFecha: Date | null;
  totalCitas: number;
  totalCitasCompletadas: number;
}

export interface PaginatedAdminMascotasDto {
  data: AdminMascotaResumenDto[];
  meta: {
    nextCursor: string | null;
    limit: number;
    hasMore: boolean;
  };
}
