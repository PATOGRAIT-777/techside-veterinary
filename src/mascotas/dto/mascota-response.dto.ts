export interface MascotaRelacionDto {
  id: string;
  nombre: string;
}

export interface ArchivoResumenDto {
  id: string;
  url: string;
}

export interface AlergiaResponseDto {
  mascotaId: string;
  alergia: MascotaRelacionDto;
  notas: string | null;
}

export interface MascotaResponseDto {
  id: string;
  propietarioId: string;
  nombre: string;
  raza: MascotaRelacionDto | null;
  color: MascotaRelacionDto | null;
  tipoPelo: MascotaRelacionDto | null;
  patronPelo: MascotaRelacionDto | null;
  comportamiento: MascotaRelacionDto | null;
  fechaNacimiento: Date | null;
  sexo: string | null;
  peso: string | null;
  esterilizado: boolean;
  ruac: string | null;
  microchip: string | null;
  tatuaje: string | null;
  fotoPerfil: ArchivoResumenDto | null;
  carnetVacunacion: ArchivoResumenDto | null;
  observaciones: string | null;
  createdAt: Date;
  updatedAt: Date;
  alergias: AlergiaResponseDto[];
}
