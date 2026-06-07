import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, EstadoPago } from '@prisma/client';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { EmailService } from '../email/email.service';

export function computePaymentDeadline(
  createdAt: Date,
  fecha: Date,
  horaInicio: Date,
): Date {
  const createdAtPlus48h = new Date(createdAt.getTime() + 48 * 60 * 60 * 1000);

  const fechaHoraInicio = new Date(
    Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate(),
      horaInicio.getUTCHours(),
      horaInicio.getUTCMinutes(),
      horaInicio.getUTCSeconds(),
    ),
  );
  const fechaHoraInicioMinus24h = new Date(
    fechaHoraInicio.getTime() - 24 * 60 * 60 * 1000,
  );

  return createdAtPlus48h < fechaHoraInicioMinus24h
    ? createdAtPlus48h
    : fechaHoraInicioMinus24h;
}

@Injectable()
export class CitasCronService {
  private readonly logger = new Logger(CitasCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly historialService: CitaEstadoHistorialService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('*/5 * * * *')
  async handlePendingToEnCurso(): Promise<void> {
    try {
      const now = new Date();
      const citas = await this.prisma.cita.findMany({
        where: {
          estado: EstadoCita.pendiente,
          fecha: { lte: now },
          horaInicio: { lte: now },
        },
      });

      for (const cita of citas) {
        await this.prisma.cita.update({
          where: { id: cita.id, estado: EstadoCita.pendiente },
          data: { estado: EstadoCita.en_curso },
        });
        await this.historialService.registrarCambio(
          cita.id,
          EstadoCita.pendiente,
          EstadoCita.en_curso,
          null,
          null,
        );
      }

      if (citas.length > 0) {
        this.logger.log(
          `Transicionadas ${citas.length} citas de pendiente a en_curso`,
        );
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cron handlePendingToEnCurso failed', err.stack);
    }
  }

  @Cron('0 * * * *')
  async handleAutoCancelUnpaid(): Promise<void> {
    try {
      const now = new Date();
      const citas = await this.prisma.cita.findMany({
        where: {
          estado: EstadoCita.pendiente_de_pago,
          pago: { estado: EstadoPago.pendiente },
        },
        include: {
          pago: true,
          mascota: { include: { propietario: true } },
        },
      });

      let cancelledCount = 0;
      for (const cita of citas) {
        const deadline = computePaymentDeadline(
          cita.createdAt,
          cita.fecha,
          cita.horaInicio,
        );
        if (now < deadline) continue;

        await this.prisma.cita.update({
          where: { id: cita.id },
          data: { estado: EstadoCita.cancelada },
        });
        await this.prisma.pago.update({
          where: { citaId: cita.id },
          data: { estado: EstadoPago.cancelada },
        });
        await this.historialService.registrarCambio(
          cita.id,
          EstadoCita.pendiente_de_pago,
          EstadoCita.cancelada,
          null,
          'Pago no recibido antes del plazo',
        );

        const fechaStr = cita.fecha.toISOString().split('T')[0];
        const horaStr = `${String(cita.horaInicio.getHours()).padStart(2, '0')}:${String(cita.horaInicio.getMinutes()).padStart(2, '0')}`;
        const medico = await this.prisma.medico.findUnique({
          where: { id: cita.medicoId },
          include: { usuario: { select: { persona: true } } },
        });
        const nombreMedico =
          medico?.usuario?.persona?.nombreCompleto ?? 'No disponible';

        if (cita.mascota?.propietario?.email) {
          this.emailService.send(
            cita.mascota.propietario.email,
            'Cita cancelada por falta de pago',
            `Cita cancelada por falta de pago\n\nMascota: ${cita.mascota.nombre}\nFecha: ${fechaStr}\nHora: ${horaStr}\nMédico: ${nombreMedico}\nFolio de pago: ${cita.pago?.folioPago ?? 'No disponible'}`,
          );
        }

        cancelledCount++;
      }

      if (cancelledCount > 0) {
        this.logger.log(`Canceladas ${cancelledCount} citas por falta de pago`);
      }
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Cron handleAutoCancelUnpaid failed', err.stack);
    }
  }
}
