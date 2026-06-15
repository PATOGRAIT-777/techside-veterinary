import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, EstadoPago, Rol } from '@prisma/client';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { CambiarEstadoCitaDto } from './dto/cambiar-estado-cita.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

import { FolioGenerator } from './helpers/folio-generator';
import { calcularPrecioCita } from './helpers/calcular-precio-cita';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { EmailService } from '../email/email.service';
import { citaInclude, mapCitaToResponse } from './citas.mapper';

@Injectable()
export class CitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly folioGenerator: FolioGenerator,
    private readonly historialService: CitaEstadoHistorialService,
    private readonly emailService: EmailService,
  ) {}

  async create(dto: CreateCitaDto, usuario: JwtPayload) {
    // V-01: Solo cliente o admin pueden crear
    if (usuario.rol !== Rol.cliente && usuario.rol !== Rol.admin) {
      throw new ForbiddenException(
        'Solo clientes y administradores pueden agendar citas',
      );
    }

    // V-02: La mascota debe pertenecer al usuario (si es cliente)
    // Admin puede especificar emailUsuario para crear cita en nombre de otro
    const mascota = await this.prisma.mascota.findUnique({
      where: { id: dto.mascotaId },
    });
    if (!mascota) {
      throw new NotFoundException('Mascota no encontrada');
    }

    let usuarioTargetEmail: string | null = null;

    if (usuario.rol === Rol.cliente) {
      if (mascota.propietarioId !== usuario.sub) {
        throw new ForbiddenException('La mascota no pertenece al usuario');
      }
    } else if (usuario.rol === Rol.admin && dto.emailUsuario) {
      const usuarioTarget = await this.prisma.usuario.findUnique({
        where: { email: dto.emailUsuario },
      });
      if (!usuarioTarget) {
        throw new NotFoundException('Usuario no encontrado');
      }
      if (mascota.propietarioId !== usuarioTarget.id) {
        throw new ForbiddenException(
          'La mascota no pertenece al usuario indicado',
        );
      }
      usuarioTargetEmail = usuarioTarget.email;
    }

    // Parsear fecha y hora
    const fechaCita = new Date(dto.fecha + 'T00:00:00');
    const [horaParte, minParte] = dto.horaInicio.split(':');
    const horaInicio = new Date(
      1970,
      0,
      1,
      parseInt(horaParte),
      parseInt(minParte),
    );
    const horaFin = new Date(horaInicio.getTime() + 60 * 60 * 1000); // +1h

    // V-04: Verificar que fecha sea futura
    const ahora = new Date();
    const fechaHoraCita = new Date(
      fechaCita.getFullYear(),
      fechaCita.getMonth(),
      fechaCita.getDate(),
      horaInicio.getHours(),
      horaInicio.getMinutes(),
    );
    if (fechaHoraCita <= ahora) {
      throw new BadRequestException(
        'La fecha y hora de la cita deben ser futuras',
      );
    }

    // V-03: Anticipación mínima de 24 horas
    const diffHoras =
      (fechaHoraCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    if (diffHoras < 24) {
      throw new BadRequestException(
        'Las citas deben agendarse con al menos 24 horas de anticipación',
      );
    }

    // V-03b: Máximo 2 meses de anticipación
    const maxFecha = new Date(ahora);
    maxFecha.setMonth(maxFecha.getMonth() + 2);
    if (fechaHoraCita > maxFecha) {
      throw new BadRequestException(
        'No se puede agendar con más de 2 meses de anticipación',
      );
    }

    // V-05: Una cita por médico por día para la misma mascota
    const citaMismoDia = await this.prisma.cita.findFirst({
      where: {
        medicoId: dto.medicoId,
        mascotaId: dto.mascotaId,
        fecha: fechaCita,
        estado: { not: EstadoCita.cancelada },
      },
    });
    if (citaMismoDia) {
      throw new ConflictException(
        'Ya existe una cita para esta mascota con este médico en este día',
      );
    }

    // V-06: No traslape médico
    await this.validarTraslapeMedico(
      dto.medicoId,
      fechaCita,
      horaInicio,
      horaFin,
    );

    // V-07: Derivar consultorio desde el horario del médico
    const consultorioId = await this.obtenerConsultorioDesdeHorario(
      dto.medicoId,
      fechaCita,
    );

    // V-08: No traslape consultorio
    await this.validarTraslapeConsultorio(
      consultorioId,
      fechaCita,
      horaInicio,
      horaFin,
    );

    // V-08: No traslape paciente (misma sucursal)
    await this.validarTraslapePaciente(
      dto.mascotaId,
      dto.sucursalId,
      fechaCita,
      horaInicio,
      horaFin,
    );

    // V-09: Sucursal cruzada (2h de diferencia con otras citas del paciente)
    await this.validarSucursalCruzada(
      dto.mascotaId,
      dto.sucursalId,
      fechaCita,
      horaInicio,
    );

    // Obtener datos del médico y su especialidad/precio
    const medicoData = await this.prisma.medico.findUnique({
      where: { id: dto.medicoId },
      include: {
        especialidadPrincipal: true,
        usuario: { select: { persona: true } },
      },
    });

    const servicioData = await this.prisma.servicio.findUnique({
      where: { id: dto.servicioId },
    });

    const precio = calcularPrecioCita(
      servicioData?.precioBase,
      medicoData?.especialidadPrincipal?.precio,
    );

    // Generar folio de pago
    const folioPago = await this.folioGenerator.generate();

    // Crear cita + pago en transacción
    const cita = await this.prisma.cita.create({
      data: {
        sucursalId: dto.sucursalId,
        medicoId: dto.medicoId,
        mascotaId: dto.mascotaId,
        servicioId: dto.servicioId,
        fecha: fechaCita,
        horaInicio,
        horaFin,
        estado: EstadoCita.pendiente_de_pago,
        motivo: dto.motivo,
        pago: {
          create: {
            folioPago,
            cantidad: precio,
            estado: EstadoPago.pendiente,
          },
        },
      },
      include: {
        ...citaInclude,
        pago: true,
      },
    });

    const citaResponse = mapCitaToResponse(cita);

    // Registrar cambio de estado inicial en audit log
    await this.historialService.registrarCambio(
      cita.id,
      null,
      EstadoCita.pendiente_de_pago,
      usuario.sub,
      null,
    );

    // Enviar email de confirmación al dueño
    const destinatario =
      usuario.rol === Rol.admin && dto.emailUsuario
        ? (usuarioTargetEmail ?? '')
        : ((
            await this.prisma.usuario.findUnique({
              where: { id: mascota.propietarioId },
            })
          )?.email ?? '');

    const nombreMedico =
      medicoData?.usuario?.persona?.nombreCompleto ?? 'No disponible';

    const consultorioData = await this.prisma.consultorio.findUnique({
      where: { id: consultorioId },
    });

    const fechaStr = fechaCita.toISOString().split('T')[0];
    const horaEmailStr = `${String(horaInicio.getHours()).padStart(2, '0')}:${String(horaInicio.getMinutes()).padStart(2, '0')}`;

    this.emailService.send(
      destinatario,
      'Confirmación de cita',
      `Confirmación de cita\n\nFecha: ${fechaStr}\nHora: ${horaEmailStr}\nMédico: ${nombreMedico}\nConsultorio: ${consultorioData?.nombre ?? 'No disponible'}\nFolio de pago: ${folioPago}\nCantidad: ${precio.toFixed(2)}`,
    );

    return citaResponse;
  }

  async findAll(usuario: JwtPayload) {
    const where: Record<string, unknown> = {};

    if (usuario.rol === Rol.cliente) {
      // Cliente solo ve citas de sus mascotas
      const mascotas = await this.prisma.mascota.findMany({
        where: { propietarioId: usuario.sub },
        select: { id: true },
      });
      where.mascotaId = { in: mascotas.map((m) => m.id) };
    } else if (usuario.rol === Rol.medico) {
      // Médico solo ve sus citas
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico) {
        where.medicoId = medico.id;
      } else {
        return [];
      }
    }
    // Admin ve todas

    const citas = await this.prisma.cita.findMany({
      where,
      include: citaInclude,
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    });
    return citas.map(mapCitaToResponse);
  }

  private async findOneWithPermissions(id: string, usuario: JwtPayload) {
    const cita = await this.prisma.cita.findUnique({
      where: { id },
      include: {
        ...citaInclude,
        receta: { include: { detalles: true } },
        consulta: true,
      },
    });
    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Verificar permisos
    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: cita.mascotaId },
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

    return cita;
  }

  async findOne(id: string, usuario: JwtPayload) {
    const cita = await this.findOneWithPermissions(id, usuario);
    return mapCitaToResponse(cita);
  }

  async update(id: string, dto: UpdateCitaDto, usuario: JwtPayload) {
    const cita = await this.findOneWithPermissions(id, usuario);

    // Solo admin o el cliente propietario pueden actualizar
    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: cita.mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException(
          'No tiene permiso para actualizar esta cita',
        );
      }
    }

    // No se puede modificar una cita completada, en curso o cancelada
    if (
      cita.estado === EstadoCita.completada ||
      cita.estado === EstadoCita.en_curso ||
      cita.estado === EstadoCita.cancelada
    ) {
      throw new BadRequestException(
        `No se puede modificar una cita en estado ${cita.estado}`,
      );
    }

    const data: Record<string, unknown> = {};

    if (dto.sucursalId) data.sucursalId = dto.sucursalId;
    if (dto.medicoId) data.medicoId = dto.medicoId;
    if (dto.servicioId) data.servicioId = dto.servicioId;
    if (dto.motivo !== undefined) data.motivo = dto.motivo;

    if (dto.fecha || dto.horaInicio) {
      const fechaStr = dto.fecha || cita.fecha.toISOString().split('T')[0];
      const horaStr = dto.horaInicio || this.formatTime(cita.horaInicio);
      const fechaCita = new Date(fechaStr + 'T00:00:00');
      const [hStr, mStr] = horaStr.split(':');
      const horaInicio = new Date(1970, 0, 1, parseInt(hStr), parseInt(mStr));
      const horaFin = new Date(horaInicio.getTime() + 60 * 60 * 1000);

      data.fecha = fechaCita;
      data.horaInicio = horaInicio;
      data.horaFin = horaFin;

      // Revalidar traslapes si cambió fecha u hora
      const effectiveMedicoId = dto.medicoId || cita.medicoId;
      const consultorioId = await this.obtenerConsultorioDesdeHorario(
        effectiveMedicoId,
        fechaCita,
      );

      await this.validarTraslapeMedico(
        effectiveMedicoId,
        fechaCita,
        horaInicio,
        horaFin,
        id,
      );
      await this.validarTraslapeConsultorio(
        consultorioId,
        fechaCita,
        horaInicio,
        horaFin,
        id,
      );
    }

    const updated = await this.prisma.cita.update({
      where: { id },
      data,
      include: citaInclude,
    });
    return mapCitaToResponse(updated);
  }

  async remove(id: string, usuario: JwtPayload) {
    const cita = await this.findOneWithPermissions(id, usuario);

    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: cita.mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException(
          'No tiene permiso para cancelar esta cita',
        );
      }
    }

    // Solo se puede cancelar si está pendiente_de_pago, pendiente o en curso
    if (
      cita.estado !== EstadoCita.pendiente_de_pago &&
      cita.estado !== EstadoCita.pendiente &&
      cita.estado !== EstadoCita.en_curso
    ) {
      throw new BadRequestException(
        `No se puede cancelar una cita en estado ${cita.estado}`,
      );
    }

    const updated = await this.prisma.cita.update({
      where: { id },
      data: { estado: EstadoCita.cancelada },
      include: citaInclude,
    });

    if (cita.estado === EstadoCita.pendiente_de_pago) {
      await this.prisma.pago.update({
        where: { citaId: id },
        data: { estado: EstadoPago.cancelada },
      });
    }

    await this.historialService.registrarCambio(
      id,
      cita.estado,
      EstadoCita.cancelada,
      usuario.sub,
      null,
    );

    return mapCitaToResponse(updated);
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoCitaDto,
    usuario: JwtPayload,
  ) {
    const cita = await this.findOneWithPermissions(id, usuario);

    // Validar transiciones de estado
    const transicionesPermitidas: Record<EstadoCita, EstadoCita[]> = {
      [EstadoCita.pendiente_de_pago]: [],
      [EstadoCita.pendiente]: [EstadoCita.en_curso, EstadoCita.cancelada],
      [EstadoCita.en_curso]: [EstadoCita.inasistencia, EstadoCita.cancelada],
      [EstadoCita.inasistencia]: [],
      [EstadoCita.completada]: [],
      [EstadoCita.cancelada]: [],
    };

    if (!transicionesPermitidas[cita.estado].includes(dto.estado)) {
      throw new BadRequestException(
        `No se puede cambiar de ${cita.estado} a ${dto.estado}`,
      );
    }

    // Solo médico de la cita o admin pueden cambiar estado
    if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== cita.medicoId) {
        throw new ForbiddenException(
          'No tiene permiso para cambiar el estado de esta cita',
        );
      }
    } else if (usuario.rol === Rol.cliente) {
      throw new ForbiddenException(
        'Los clientes no pueden cambiar el estado de las citas',
      );
    }

    // Guarda de tiempo para inasistencia: no se puede marcar antes de horaInicio
    if (dto.estado === EstadoCita.inasistencia) {
      const ahora = new Date();
      const fechaHoraInicio = new Date(
        cita.fecha.getFullYear(),
        cita.fecha.getMonth(),
        cita.fecha.getDate(),
        cita.horaInicio.getHours(),
        cita.horaInicio.getMinutes(),
      );
      if (ahora < fechaHoraInicio) {
        throw new BadRequestException(
          'No se puede marcar inasistencia antes de la hora de inicio de la cita',
        );
      }
    }

    const updated = await this.prisma.cita.update({
      where: { id },
      data: { estado: dto.estado },
      include: citaInclude,
    });

    // Registrar transición en audit log
    await this.historialService.registrarCambio(
      id,
      cita.estado,
      dto.estado,
      usuario.sub,
      null,
    );

    return mapCitaToResponse(updated);
  }

  // =================== Validaciones privadas ===================

  private async validarTraslapeMedico(
    medicoId: string,
    fecha: Date,
    horaInicio: Date,
    horaFin: Date,
    excludeId?: string,
  ) {
    const citas = await this.prisma.cita.findMany({
      where: {
        medicoId,
        fecha,
        estado: { not: EstadoCita.cancelada },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    const inicio = this.timeToMinutes(horaInicio);
    const fin = this.timeToMinutes(horaFin);

    for (const c of citas) {
      const cInicio = this.timeToMinutes(c.horaInicio);
      const cFin = this.timeToMinutes(c.horaFin);
      if (inicio < cFin && fin > cInicio) {
        throw new ConflictException(
          'El médico ya tiene una cita en ese horario',
        );
      }
    }
  }

  private async validarTraslapeConsultorio(
    consultorioId: string,
    fecha: Date,
    horaInicio: Date,
    horaFin: Date,
    excludeId?: string,
  ) {
    // Buscar todos los médicos que usan este consultorio en este día
    const diaSemana = this.numToDiaSemana(fecha.getDay());
    const horarios = await this.prisma.medicoHorario.findMany({
      where: {
        consultorioId,
        diaSemana,
      },
      select: { medicoId: true },
    });

    const medicoIds = [...new Set(horarios.map((h) => h.medicoId))];
    if (medicoIds.length === 0) return;

    const citas = await this.prisma.cita.findMany({
      where: {
        medicoId: { in: medicoIds },
        fecha,
        estado: { not: EstadoCita.cancelada },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    const inicio = this.timeToMinutes(horaInicio);
    const fin = this.timeToMinutes(horaFin);

    for (const c of citas) {
      const cInicio = this.timeToMinutes(c.horaInicio);
      const cFin = this.timeToMinutes(c.horaFin);
      if (inicio < cFin && fin > cInicio) {
        throw new ConflictException(
          'El consultorio ya está ocupado en ese horario',
        );
      }
    }
  }

  private async obtenerConsultorioDesdeHorario(
    medicoId: string,
    fecha: Date,
  ): Promise<string> {
    const diaSemana = this.numToDiaSemana(fecha.getDay());
    const horario = await this.prisma.medicoHorario.findFirst({
      where: { medicoId, diaSemana },
    });
    if (!horario) {
      throw new BadRequestException(
        'El médico no tiene horario configurado para este día',
      );
    }
    return horario.consultorioId;
  }

  private async validarTraslapePaciente(
    mascotaId: string,
    sucursalId: string,
    fecha: Date,
    horaInicio: Date,
    horaFin: Date,
    excludeId?: string,
  ) {
    const citas = await this.prisma.cita.findMany({
      where: {
        mascotaId,
        sucursalId,
        fecha,
        estado: { not: EstadoCita.cancelada },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    const inicio = this.timeToMinutes(horaInicio);
    const fin = this.timeToMinutes(horaFin);

    for (const c of citas) {
      const cInicio = this.timeToMinutes(c.horaInicio);
      const cFin = this.timeToMinutes(c.horaFin);
      if (inicio < cFin && fin > cInicio) {
        throw new ConflictException(
          'La mascota ya tiene una cita en este horario en esta sucursal',
        );
      }
    }
  }

  private async validarSucursalCruzada(
    mascotaId: string,
    sucursalId: string,
    fecha: Date,
    horaInicio: Date,
  ) {
    // Buscar citas del paciente en otras sucursales en la misma fecha
    const citasOtrasSucursales = await this.prisma.cita.findMany({
      where: {
        mascotaId,
        sucursalId: { not: sucursalId },
        fecha,
        estado: { not: EstadoCita.cancelada },
      },
    });

    const inicioMin = this.timeToMinutes(horaInicio);

    for (const c of citasOtrasSucursales) {
      const cInicio = this.timeToMinutes(c.horaInicio);
      const diffMin = Math.abs(inicioMin - cInicio);
      if (diffMin < 120) {
        throw new ConflictException(
          'Debe haber al menos 2 horas de diferencia entre citas en distintas sucursales',
        );
      }
    }
  }

  // =================== Helpers ===================

  private timeToMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }

  private formatTime(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  private numToDiaSemana(num: number) {
    const map = [
      'domingo',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
    ] as const;
    return map[num];
  }
}
