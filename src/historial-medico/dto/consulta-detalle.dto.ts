export interface ConsultaDetalleDto {
  peso: number | null;
  temperatura: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  presionArterial: string | null;
  estadoGeneral?: string | null;
  notasEvolucion?: string | null;
}
