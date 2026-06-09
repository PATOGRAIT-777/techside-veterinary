export interface MascotaResumenDto {
  id: string;
  nombre: string;
  raza: { id: string; nombre: string } | null;
  color: { id: string; nombre: string } | null;
  tipoPelo: { id: string; nombre: string } | null;
  patronPelo: { id: string; nombre: string } | null;
  comportamiento: { id: string; nombre: string } | null;
  fotoPerfil: { id: string; url: string } | null;
  carnetVacunacion: { id: string; url: string } | null;
}
