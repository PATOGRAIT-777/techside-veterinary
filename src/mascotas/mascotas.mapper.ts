import { Prisma } from '@prisma/client';
import {
  MascotaResponseDto,
  MascotaRelacionDto,
  ArchivoResumenDto,
  AlergiaResponseDto,
} from './dto/mascota-response.dto';

export const mascotaInclude = {
  raza: true,
  color: true,
  tipoPelo: true,
  patronPelo: true,
  comportamiento: true,
  fotoPerfil: true,
  carnetVacunacion: true,
  alergias: { include: { alergia: true } },
} as const;

export type MascotaWithRelations = Prisma.MascotaGetPayload<{
  include: typeof mascotaInclude;
}>;

function toRelacion<T extends { id: string; nombre: string }>(
  obj: T | null | undefined,
): MascotaRelacionDto | null {
  return obj ? { id: obj.id, nombre: obj.nombre } : null;
}

function toArchivoResumen<T extends { id: string; url: string }>(
  obj: T | null | undefined,
): ArchivoResumenDto | null {
  return obj ? { id: obj.id, url: obj.url } : null;
}

export function mapMascotaToResponse(
  mascota: MascotaWithRelations,
): MascotaResponseDto {
  const alergias = (mascota.alergias ?? []) as Array<{
    mascotaId: string;
    notas: string | null;
    alergia: { id: string; nombre: string } | null;
  }>;

  return {
    id: mascota.id,
    propietarioId: mascota.propietarioId,
    nombre: mascota.nombre,
    raza: toRelacion(mascota.raza),
    color: toRelacion(mascota.color),
    tipoPelo: toRelacion(mascota.tipoPelo),
    patronPelo: toRelacion(mascota.patronPelo),
    comportamiento: toRelacion(mascota.comportamiento),
    fechaNacimiento: mascota.fechaNacimiento ?? null,
    sexo: mascota.sexo ?? null,
    peso: mascota.peso ? mascota.peso.toString() : null,
    esterilizado: mascota.esterilizado ?? false,
    ruac: mascota.ruac ?? null,
    microchip: mascota.microchip ?? null,
    tatuaje: mascota.tatuaje ?? null,
    fotoPerfil: toArchivoResumen(mascota.fotoPerfil),
    carnetVacunacion: toArchivoResumen(mascota.carnetVacunacion),
    observaciones: mascota.observaciones ?? null,
    createdAt: mascota.createdAt,
    updatedAt: mascota.updatedAt,
    alergias: alergias.map(
      (a): AlergiaResponseDto => ({
        mascotaId: a.mascotaId,
        alergia: toRelacion(a.alergia)!,
        notas: a.notas ?? null,
      }),
    ),
  };
}
