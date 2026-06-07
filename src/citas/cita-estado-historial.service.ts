import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CitaEstadoHistorialService {
  constructor(private readonly prisma: PrismaService) {}

  async registrarCambio(
    citaId: string,
    estadoAnterior: string | null,
    estadoNuevo: string,
    usuarioId?: string | null,
    razon?: string | null,
  ) {
    return this.prisma.citaEstadoHistorial.create({
      data: {
        citaId,
        estadoAnterior,
        estadoNuevo,
        usuarioId: usuarioId ?? null,
        razon: razon ?? null,
      },
    });
  }
}
