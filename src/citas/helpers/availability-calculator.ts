import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EstadoCita } from '@prisma/client';

export interface DiaDisponibilidad {
  fecha: string;
  disponible: boolean;
}

export interface SlotDisponibilidad {
  horaInicio: string;
  horaFin: string;
  disponible: boolean;
}

export interface SlotsResponse {
  slots: SlotDisponibilidad[];
}

@Injectable()
export class AvailabilityCalculator {
  constructor(private readonly prisma: PrismaService) {}

  async computeDays(
    medicoId: string,
    desde: Date,
    hasta: Date,
  ): Promise<DiaDisponibilidad[]> {
    const horarios = await this.prisma.medicoHorario.findMany({
      where: { medicoId },
    });

    if (horarios.length === 0) {
      return [];
    }

    const diasConHorario = new Set(horarios.map((h) => String(h.diaSemana)));
    const result: DiaDisponibilidad[] = [];

    const current = this.startOfDayUtc(desde);
    const end = this.startOfDayUtc(hasta);

    while (current <= end) {
      const diaSemana = this.numToDiaSemana(current.getUTCDay());
      if (diasConHorario.has(diaSemana)) {
        const fechaStr = this.formatDate(current);
        const slots = await this.computeSlots(medicoId, new Date(fechaStr));
        const disponible = slots.slots.some((s) => s.disponible);
        result.push({ fecha: fechaStr, disponible });
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return result;
  }

  async computeSlots(medicoId: string, fecha: Date): Promise<SlotsResponse> {
    const diaSemana = this.numToDiaSemana(fecha.getUTCDay());

    const horarios = await this.prisma.medicoHorario.findMany({
      where: { medicoId, diaSemana: diaSemana as never },
    });

    if (horarios.length === 0) {
      return { slots: [] };
    }

    const consultorioIds = [...new Set(horarios.map((h) => h.consultorioId))];

    const otrosHorarios = await this.prisma.medicoHorario.findMany({
      where: {
        consultorioId: { in: consultorioIds },
        diaSemana: diaSemana as never,
        medicoId: { not: medicoId },
      },
      select: { medicoId: true },
    });
    const otrosMedicoIds = otrosHorarios.map((h) => h.medicoId);

    const citas = await this.prisma.cita.findMany({
      where: {
        fecha,
        estado: {
          notIn: [EstadoCita.cancelada, EstadoCita.inasistencia],
        },
        OR: [{ medicoId }, { medicoId: { in: otrosMedicoIds } }],
      },
    });

    const slots: SlotDisponibilidad[] = [];

    for (const horario of horarios) {
      const hInicio = this.timeToMinutes(horario.horaInicio);
      const hFin = this.timeToMinutes(horario.horaFin);

      for (let min = hInicio; min < hFin; min += 60) {
        const ocupado = citas.some((c) => {
          const cInicio = this.timeToMinutes(c.horaInicio);
          const cFin = this.timeToMinutes(c.horaFin);
          return min < cFin && min + 60 > cInicio;
        });

        slots.push({
          horaInicio: this.formatTimeFromMinutes(min),
          horaFin: this.formatTimeFromMinutes(min + 60),
          disponible: !ocupado,
        });
      }
    }

    return { slots };
  }

  private timeToMinutes(date: Date): number {
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  private formatTimeFromMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private formatDate(date: Date): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfDayUtc(date: Date): Date {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  private numToDiaSemana(num: number): string {
    const map = [
      'domingo',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
    ];
    return map[num];
  }
}
