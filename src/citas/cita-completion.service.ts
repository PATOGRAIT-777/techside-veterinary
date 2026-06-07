import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita } from '@prisma/client';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';

@Injectable()
export class CitaCompletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly historialService: CitaEstadoHistorialService,
  ) {}

  async checkAndComplete(citaId: string): Promise<void> {
    const cita = await this.prisma.cita.findUnique({
      where: { id: citaId },
      include: { consulta: true, receta: true },
    });

    if (!cita || cita.estado !== EstadoCita.en_curso) return;
    if (!cita.consulta || !cita.receta) return;

    await this.prisma.cita.update({
      where: { id: citaId, estado: EstadoCita.en_curso },
      data: { estado: EstadoCita.completada },
    });

    await this.historialService.registrarCambio(
      citaId,
      EstadoCita.en_curso,
      EstadoCita.completada,
      null,
      'Consulta y receta registradas',
    );
  }
}
