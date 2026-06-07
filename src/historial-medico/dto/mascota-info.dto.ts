export interface MascotaInfoDto {
  id: string;
  nombre: string;
  raza: string | null;
  color: string | null;
  fechaNacimiento: Date | null;
  sexo: string | null;
  esterilizado: boolean;
  ruac: string | null;
  microchip: string | null;
  fotoPerfilUrl: string | null;
  carnetVacunacionUrl: string | null;
  observaciones: string | null;
  alergias: { nombre: string; notas: string | null }[];
  comportamiento?: string | null;
  requiereBozal?: boolean;
}
