import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, EstadoPago, Rol } from '@prisma/client';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HistorialResumenDto } from './dto/historial-resumen.dto';
import { CitaResumenDto } from './dto/cita-resumen.dto';
import { CitaDetalleDto } from './dto/cita-detalle.dto';
import { PesoHistorialItemDto } from './dto/peso-historial.dto';
import { PaginatedCitasDto } from './dto/paginated-citas.dto';
import { decodeCursor, encodeCursor } from './helpers/cursor-helpers';
import { PdfGeneratorService } from './pdf/pdf-generator.service';

@Injectable()
export class HistorialMedicoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfGeneratorService,
  ) {}

  // ── Validación de acceso ──

  async validarAcceso(mascotaId: string, usuario: JwtPayload) {
    const mascota = await this.prisma.mascota.findUnique({
      where: { id: mascotaId },
      include: { propietario: true },
    });

    if (!mascota) {
      throw new NotFoundException('Mascota no encontrada');
    }

    let tieneRelacion = false;

    if (usuario.rol === Rol.cliente) {
      tieneRelacion = mascota.propietarioId === usuario.sub;
    } else if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico) {
        const count = await this.prisma.cita.count({
          where: {
            mascotaId,
            medicoId: medico.id,
            estado: {
              in: [
                EstadoCita.completada,
                EstadoCita.pendiente,
                EstadoCita.pendiente_de_pago,
                EstadoCita.en_curso,
              ],
            },
          },
        });
        tieneRelacion = count > 0;
      }
    } else if (usuario.rol === Rol.admin) {
      tieneRelacion = true;
    }

    if (!tieneRelacion) {
      throw new ForbiddenException(
        'No tiene permiso para ver el historial de esta mascota',
      );
    }

    return { mascota, tieneRelacion };
  }

  // ── Endpoints ──

  async getResumen(
    mascotaId: string,
    usuario: JwtPayload,
  ): Promise<HistorialResumenDto> {
    await this.validarAcceso(mascotaId, usuario);

    const mascota = await this.prisma.mascota.findUnique({
      where: { id: mascotaId },
      include: {
        raza: { include: { especie: true } },
        color: true,
        tipoPelo: true,
        patronPelo: true,
        comportamiento: true,
        alergias: { include: { alergia: true } },
        propietario: { include: { persona: true } },
        fotoPerfil: true,
        carnetVacunacion: true,
      },
    });

    if (!mascota) {
      throw new NotFoundException('Mascota no encontrada');
    }

    const [
      frecuenciaCardiacaPromedio,
      ultimaVisita,
      proximaVisita,
      pesoActual,
      pesoHistorial,
      proximasCitas,
      ultimasCitas,
    ] = await Promise.all([
      this.calcularFrecuenciaCardiacaPromedio(mascotaId),
      this.calcularUltimaVisita(mascotaId),
      this.calcularProximaVisita(mascotaId),
      this.calcularPesoActual(mascotaId),
      this.getPesoHistorialConLimite(mascotaId, 20),
      this.getProximasCitas(mascotaId, 10),
      this.getUltimasCitas(mascotaId, 5),
    ]);

    const dto: HistorialResumenDto = {
      mascota: {
        id: mascota.id,
        nombre: mascota.nombre,
        raza: mascota.raza?.nombre ?? null,
        color: mascota.color?.nombre ?? null,
        fechaNacimiento: mascota.fechaNacimiento,
        sexo: mascota.sexo,
        esterilizado: mascota.esterilizado,
        ruac: mascota.ruac,
        microchip: mascota.microchip,
        fotoPerfilUrl: mascota.fotoPerfil?.url ?? null,
        carnetVacunacionUrl: mascota.carnetVacunacion?.url ?? null,
        observaciones: mascota.observaciones,
        alergias: mascota.alergias.map((a) => ({
          nombre: a.alergia.nombre,
          notas: a.notas,
        })),
      },
      agregados: {
        frecuenciaCardiacaPromedio,
        ultimaVisita,
        proximaVisita,
      },
      proximasCitas,
      ultimasCitas,
      pesoActual,
      pesoHistorial,
    };

    if (usuario.rol === Rol.medico || usuario.rol === Rol.admin) {
      dto.mascota.comportamiento = mascota.comportamiento?.nombre ?? null;
      dto.mascota.requiereBozal =
        mascota.comportamiento?.requiereBozal ?? false;
      dto.propietario = {
        nombreCompleto: mascota.propietario.persona.nombreCompleto,
        telefono: mascota.propietario.persona.telefono,
        email: mascota.propietario.email,
      };
    }

    return dto;
  }

  async getCitasProximas(
    mascotaId: string,
    usuario: JwtPayload,
  ): Promise<{ data: CitaResumenDto[] }> {
    await this.validarAcceso(mascotaId, usuario);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const citas = await this.prisma.cita.findMany({
      where: {
        mascotaId,
        estado: {
          in: [
            EstadoCita.pendiente_de_pago,
            EstadoCita.pendiente,
            EstadoCita.en_curso,
          ],
        },
        fecha: { gte: today },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      include: {
        medico: {
          include: {
            especialidadPrincipal: true,
            usuario: { include: { persona: true } },
          },
        },
        sucursal: true,
        pago: true,
      },
    });

    return {
      data: citas.map((c) => this.mapCitaToResumen(c)),
    };
  }

  async getCitasPasadas(
    mascotaId: string,
    usuario: JwtPayload,
    cursor?: string,
    limit?: number,
  ): Promise<PaginatedCitasDto> {
    await this.validarAcceso(mascotaId, usuario);

    const pageSize = Math.min(Math.max(limit ?? 20, 1), 100);

    const citas = await this.prisma.cita.findMany({
      where: { mascotaId },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }, { id: 'desc' }],
      take: pageSize + 1,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: decodeCursor(cursor).id } : undefined,
      include: {
        medico: {
          include: {
            especialidadPrincipal: true,
            usuario: { include: { persona: true } },
          },
        },
        sucursal: true,
      },
    });

    const hasMore = citas.length > pageSize;
    const data = hasMore ? citas.slice(0, pageSize) : citas;

    const nextCursor = hasMore
      ? encodeCursor({
          fecha: data[data.length - 1].fecha.toISOString().split('T')[0],
          horaInicio: this.formatTime(data[data.length - 1].horaInicio),
          id: data[data.length - 1].id,
        })
      : null;

    return {
      data: data.map((c) => this.mapCitaToResumen(c)),
      meta: {
        nextCursor,
        limit: pageSize,
        hasMore,
      },
    };
  }

  async getCitaDetalle(
    mascotaId: string,
    citaId: string,
    usuario: JwtPayload,
  ): Promise<CitaDetalleDto> {
    const cita = await this.prisma.cita.findFirst({
      where: { id: citaId, mascotaId },
      include: {
        medico: {
          include: {
            especialidadPrincipal: true,
            usuario: { include: { persona: true } },
          },
        },
        sucursal: true,
        receta: { include: { detalles: true } },
        consulta: true,
        pago: true,
      },
    });

    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    // RBAC por cita
    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException('No tiene permiso para ver esta cita');
      }
    } else if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== cita.medicoId) {
        throw new ForbiddenException('No tiene permiso para ver esta cita');
      }
    }
    // Admin: no restriction

    const esMedicoOAdmin =
      usuario.rol === Rol.medico || usuario.rol === Rol.admin;

    return {
      id: cita.id,
      estado: cita.estado,
      especialidad: cita.medico.especialidadPrincipal?.nombre ?? 'General',
      medico: cita.medico.usuario.persona.nombreCompleto,
      fecha: cita.fecha,
      horaInicio: this.formatTime(cita.horaInicio),
      horaFin: this.formatTime(cita.horaFin),
      sucursal: cita.sucursal.nombre,
      motivo: cita.motivo,
      receta: cita.receta
        ? {
            diagnostico: cita.receta.diagnostico,
            observaciones: cita.receta.observaciones,
            fechaReceta: cita.receta.fechaReceta,
            detalles: cita.receta.detalles.map((d) => ({
              medicamento: d.medicamento,
              dosis: d.dosis,
              frecuencia: d.frecuencia,
              duracion: d.duracion,
              viaAdministracion: d.viaAdministracion,
              instrucciones: d.instrucciones,
            })),
          }
        : null,
      consulta: cita.consulta
        ? {
            peso: cita.consulta.peso
              ? parseFloat(cita.consulta.peso.toString())
              : null,
            temperatura: cita.consulta.temperatura
              ? parseFloat(cita.consulta.temperatura.toString())
              : null,
            frecuenciaCardiaca: cita.consulta.frecuenciaCardiaca,
            frecuenciaRespiratoria: cita.consulta.frecuenciaRespiratoria,
            presionArterial: cita.consulta.presionArterial,
            ...(esMedicoOAdmin && {
              estadoGeneral: cita.consulta.estadoGeneral,
              notasEvolucion: cita.consulta.notasEvolucion,
            }),
          }
        : null,
      pago: cita.pago
        ? {
            folioPago: cita.pago.folioPago,
            cantidad: parseFloat(cita.pago.cantidad.toString()),
            estado: cita.pago.estado,
            fechaPago: cita.pago.fechaPago,
          }
        : null,
    };
  }

  async getPesoHistorial(
    mascotaId: string,
    usuario: JwtPayload,
  ): Promise<{ data: PesoHistorialItemDto[] }> {
    await this.validarAcceso(mascotaId, usuario);

    const consultas = await this.prisma.consulta.findMany({
      where: {
        cita: { mascotaId },
        peso: { not: null },
      },
      orderBy: { cita: { fecha: 'asc' } },
      include: { cita: { select: { fecha: true } } },
    });

    return {
      data: consultas.map((c) => ({
        fecha: c.cita.fecha,
        peso: parseFloat(c.peso!.toString()),
      })),
    };
  }

  async generatePdf(mascotaId: string, usuario: JwtPayload): Promise<Buffer> {
    await this.validarAcceso(mascotaId, usuario);

    const resumen = await this.getResumen(mascotaId, usuario);
    const pesoCompleto = await this.getPesoHistorialCompleto(mascotaId);
    const citasCompletas = await this.getAllCitasForPdf(mascotaId, usuario);

    return this.pdfService.generateHistorialPdf(
      resumen,
      citasCompletas,
      pesoCompleto,
    );
  }

  private async getPesoHistorialCompleto(
    mascotaId: string,
  ): Promise<PesoHistorialItemDto[]> {
    const consultas = await this.prisma.consulta.findMany({
      where: {
        cita: { mascotaId },
        peso: { not: null },
      },
      orderBy: { cita: { fecha: 'asc' } },
      include: { cita: { select: { fecha: true } } },
    });

    return consultas.map((c) => ({
      fecha: c.cita.fecha,
      peso: parseFloat(c.peso!.toString()),
    }));
  }

  private async getAllCitasForPdf(
    mascotaId: string,
    usuario: JwtPayload,
  ): Promise<CitaDetalleDto[]> {
    const citas = await this.prisma.cita.findMany({
      where: { mascotaId },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
      include: {
        medico: {
          include: {
            especialidadPrincipal: true,
            usuario: { include: { persona: true } },
          },
        },
        sucursal: true,
        receta: { include: { detalles: true } },
        consulta: true,
        pago: true,
      },
    });

    const esMedicoOAdmin =
      usuario.rol === Rol.medico || usuario.rol === Rol.admin;

    return citas.map((cita) => ({
      id: cita.id,
      estado: cita.estado,
      especialidad: cita.medico.especialidadPrincipal?.nombre ?? 'General',
      medico: cita.medico.usuario.persona.nombreCompleto,
      fecha: cita.fecha,
      horaInicio: this.formatTime(cita.horaInicio),
      horaFin: this.formatTime(cita.horaFin),
      sucursal: cita.sucursal?.nombre ?? '',
      motivo: cita.motivo,
      receta: cita.receta
        ? {
            diagnostico: cita.receta.diagnostico,
            observaciones: cita.receta.observaciones,
            fechaReceta: cita.receta.fechaReceta,
            detalles: cita.receta.detalles.map((d) => ({
              medicamento: d.medicamento,
              dosis: d.dosis,
              frecuencia: d.frecuencia,
              duracion: d.duracion,
              viaAdministracion: d.viaAdministracion,
              instrucciones: d.instrucciones,
            })),
          }
        : null,
      consulta: cita.consulta
        ? {
            peso: cita.consulta.peso
              ? parseFloat(cita.consulta.peso.toString())
              : null,
            temperatura: cita.consulta.temperatura
              ? parseFloat(cita.consulta.temperatura.toString())
              : null,
            frecuenciaCardiaca: cita.consulta.frecuenciaCardiaca,
            frecuenciaRespiratoria: cita.consulta.frecuenciaRespiratoria,
            presionArterial: cita.consulta.presionArterial,
            ...(esMedicoOAdmin && {
              estadoGeneral: cita.consulta.estadoGeneral,
              notasEvolucion: cita.consulta.notasEvolucion,
            }),
          }
        : null,
      pago: cita.pago
        ? {
            folioPago: cita.pago.folioPago,
            cantidad: parseFloat(cita.pago.cantidad.toString()),
            estado: cita.pago.estado,
            fechaPago: cita.pago.fechaPago,
          }
        : null,
    }));
  }

  // ── Helpers privados ──

  private async calcularFrecuenciaCardiacaPromedio(
    mascotaId: string,
  ): Promise<number | null> {
    const result = await this.prisma.consulta.aggregate({
      where: {
        cita: { mascotaId },
        frecuenciaCardiaca: { not: null },
      },
      _avg: { frecuenciaCardiaca: true },
    });

    return result._avg.frecuenciaCardiaca
      ? Math.round(result._avg.frecuenciaCardiaca * 10) / 10
      : null;
  }

  private async calcularUltimaVisita(mascotaId: string): Promise<Date | null> {
    const result = await this.prisma.cita.findFirst({
      where: {
        mascotaId,
        estado: EstadoCita.completada,
      },
      orderBy: { fecha: 'desc' },
      select: { fecha: true },
    });

    return result?.fecha ?? null;
  }

  private async calcularProximaVisita(mascotaId: string): Promise<Date | null> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.cita.findFirst({
      where: {
        mascotaId,
        estado: {
          in: [
            EstadoCita.pendiente,
            EstadoCita.pendiente_de_pago,
            EstadoCita.en_curso,
          ],
        },
        fecha: { gte: today },
      },
      orderBy: { fecha: 'asc' },
      select: { fecha: true },
    });

    return result?.fecha ?? null;
  }

  private async calcularPesoActual(mascotaId: string): Promise<number | null> {
    const result = await this.prisma.consulta.findFirst({
      where: {
        cita: { mascotaId },
        peso: { not: null },
      },
      orderBy: { cita: { fecha: 'desc' } },
      select: { peso: true },
    });

    return result?.peso ? parseFloat(result.peso.toString()) : null;
  }

  private async getPesoHistorialConLimite(
    mascotaId: string,
    limit?: number,
  ): Promise<PesoHistorialItemDto[]> {
    const consultas = await this.prisma.consulta.findMany({
      where: {
        cita: { mascotaId },
        peso: { not: null },
      },
      orderBy: { cita: { fecha: 'desc' } },
      take: limit,
      include: { cita: { select: { fecha: true } } },
    });

    return consultas.map((c) => ({
      fecha: c.cita.fecha,
      peso: parseFloat(c.peso!.toString()),
    }));
  }

  private async getProximasCitas(
    mascotaId: string,
    limit: number,
  ): Promise<CitaResumenDto[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const citas = await this.prisma.cita.findMany({
      where: {
        mascotaId,
        estado: {
          in: [
            EstadoCita.pendiente,
            EstadoCita.pendiente_de_pago,
            EstadoCita.en_curso,
          ],
        },
        fecha: { gte: today },
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
      take: limit,
      include: {
        medico: {
          include: {
            especialidadPrincipal: true,
            usuario: { include: { persona: true } },
          },
        },
        sucursal: true,
        pago: true,
      },
    });

    return citas.map((c) => this.mapCitaToResumen(c));
  }

  private async getUltimasCitas(
    mascotaId: string,
    limit: number,
  ): Promise<CitaResumenDto[]> {
    const citas = await this.prisma.cita.findMany({
      where: { mascotaId },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'desc' }],
      take: limit,
      include: {
        medico: {
          include: {
            especialidadPrincipal: true,
            usuario: { include: { persona: true } },
          },
        },
        sucursal: true,
        pago: true,
      },
    });

    return citas.map((c) => this.mapCitaToResumen(c));
  }

  private mapCitaToResumen(cita: {
    id: string;
    estado: EstadoCita;
    fecha: Date;
    horaInicio: Date;
    horaFin: Date;
    motivo: string | null;
    medico: {
      especialidadPrincipal: { nombre: string } | null;
      usuario: {
        persona: { nombreCompleto: string };
      };
    };
    sucursal: { nombre: string } | null;
    pago?: { estado: string } | null;
  }): CitaResumenDto {
    return {
      id: cita.id,
      estado: cita.estado,
      especialidad: cita.medico.especialidadPrincipal?.nombre ?? 'General',
      medico: cita.medico.usuario.persona.nombreCompleto,
      fecha: cita.fecha,
      horaInicio: this.formatTime(cita.horaInicio),
      horaFin: this.formatTime(cita.horaFin),
      sucursal: cita.sucursal?.nombre ?? '',
      motivo: cita.motivo,
      estadoPago: cita.pago?.estado as EstadoPago | null,
    };
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
}
