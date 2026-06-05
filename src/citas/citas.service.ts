import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, Rol } from '@prisma/client';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { CambiarEstadoCitaDto } from './dto/cambiar-estado-cita.dto';
import { DisponibilidadQueryDto } from './dto/disponibilidad-query.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class CitasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCitaDto, usuario: JwtPayload) {
    // V-01: Solo cliente o admin pueden crear
    if (usuario.rol !== Rol.cliente && usuario.rol !== Rol.admin) {
      throw new ForbiddenException(
        'Solo clientes y administradores pueden agendar citas',
      );
    }

    // V-02: La mascota debe pertenecer al usuario (si es cliente)
    const mascota = await this.prisma.mascota.findUnique({
      where: { id: dto.mascotaId },
    });
    if (!mascota) {
      throw new NotFoundException('Mascota no encontrada');
    }
    if (usuario.rol === Rol.cliente && mascota.propietarioId !== usuario.sub) {
      throw new ForbiddenException('La mascota no pertenece al usuario');
    }

    // Parsear fecha y hora
    const fechaCita = new Date(dto.fecha + 'T00:00:00');
    const [horaStr, minStr] = dto.horaInicio.split(':');
    const horaInicio = new Date(
      1970,
      0,
      1,
      parseInt(horaStr),
      parseInt(minStr),
    );
    const horaFin = new Date(horaInicio.getTime() + 60 * 60 * 1000); // +1h

    // V-03: Anticipación mínima de 24 horas
    const ahora = new Date();
    const diffHoras =
      (fechaCita.getTime() - ahora.getTime()) / (1000 * 60 * 60);
    if (diffHoras < 24) {
      throw new BadRequestException(
        'Las citas deben agendarse con al menos 24 horas de anticipación',
      );
    }

    // V-04: Verificar que fecha sea futura
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

    // V-07: No traslape consultorio
    await this.validarTraslapeConsultorio(
      dto.consultorioId,
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

    return this.prisma.cita.create({
      data: {
        sucursalId: dto.sucursalId,
        medicoId: dto.medicoId,
        mascotaId: dto.mascotaId,
        consultorioId: dto.consultorioId,
        servicioId: dto.servicioId,
        fecha: fechaCita,
        horaInicio,
        horaFin,
        estado: EstadoCita.pendiente,
        motivo: dto.motivo,
      },
      include: {
        sucursal: true,
        medico: true,
        mascota: true,
        consultorio: true,
        servicio: true,
      },
    });
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

    return this.prisma.cita.findMany({
      where,
      include: {
        sucursal: true,
        medico: { include: { usuario: { select: { persona: true } } } },
        mascota: true,
        consultorio: true,
        servicio: true,
      },
      orderBy: [{ fecha: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async findOne(id: string, usuario: JwtPayload) {
    const cita = await this.prisma.cita.findUnique({
      where: { id },
      include: {
        sucursal: true,
        medico: { include: { usuario: { select: { persona: true } } } },
        mascota: true,
        consultorio: true,
        servicio: true,
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

  async update(id: string, dto: UpdateCitaDto, usuario: JwtPayload) {
    const cita = await this.findOne(id, usuario);

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
    if (dto.consultorioId) data.consultorioId = dto.consultorioId;
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
      await this.validarTraslapeMedico(
        dto.medicoId || cita.medicoId,
        fechaCita,
        horaInicio,
        horaFin,
        id,
      );
      await this.validarTraslapeConsultorio(
        dto.consultorioId || cita.consultorioId,
        fechaCita,
        horaInicio,
        horaFin,
        id,
      );
    }

    return this.prisma.cita.update({
      where: { id },
      data,
      include: {
        sucursal: true,
        medico: true,
        mascota: true,
        consultorio: true,
        servicio: true,
      },
    });
  }

  async remove(id: string, usuario: JwtPayload) {
    const cita = await this.findOne(id, usuario);

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

    // Solo se puede cancelar si está pendiente o en curso
    if (
      cita.estado !== EstadoCita.pendiente &&
      cita.estado !== EstadoCita.en_curso
    ) {
      throw new BadRequestException(
        `No se puede cancelar una cita en estado ${cita.estado}`,
      );
    }

    return this.prisma.cita.update({
      where: { id },
      data: { estado: EstadoCita.cancelada },
    });
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoCitaDto,
    usuario: JwtPayload,
  ) {
    const cita = await this.findOne(id, usuario);

    // Validar transiciones de estado
    const transicionesPermitidas: Record<EstadoCita, EstadoCita[]> = {
      [EstadoCita.pendiente]: [EstadoCita.en_curso, EstadoCita.cancelada],
      [EstadoCita.en_curso]: [
        EstadoCita.completada,
        EstadoCita.inasistencia,
        EstadoCita.cancelada,
      ],
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

    return this.prisma.cita.update({
      where: { id },
      data: { estado: dto.estado },
    });
  }

  async disponibilidad(query: DisponibilidadQueryDto) {
    const fecha = new Date(query.fecha + 'T00:00:00');
    const diaSemana = fecha.getDay(); // 0=domingo, 1=lunes, ...

    // Obtener horarios del médico para ese día
    const horarios = await this.prisma.medicoHorario.findMany({
      where: {
        medicoId: query.medicoId,
        diaSemana: this.numToDiaSemana(diaSemana),
      },
    });

    if (horarios.length === 0) {
      return { slots: [] };
    }

    // Obtener citas existentes del médico en esa fecha
    const citas = await this.prisma.cita.findMany({
      where: {
        medicoId: query.medicoId,
        fecha,
        estado: { not: EstadoCita.cancelada },
      },
    });

    // Generar slots de 1 hora
    const slots: {
      horaInicio: string;
      horaFin: string;
      disponible: boolean;
    }[] = [];

    for (const horario of horarios) {
      const hInicio = this.timeToMinutes(horario.horaInicio);
      const hFin = this.timeToMinutes(horario.horaFin);

      for (let min = hInicio; min < hFin; min += 60) {
        const slotInicio = new Date(1970, 0, 1, Math.floor(min / 60), min % 60);
        const slotFin = new Date(slotInicio.getTime() + 60 * 60 * 1000);

        // Verificar si el slot se traslapa con alguna cita
        const ocupado = citas.some((c) => {
          const cInicio = this.timeToMinutes(c.horaInicio);
          const cFin = this.timeToMinutes(c.horaFin);
          const sInicio = min;
          const sFin = min + 60;
          return sInicio < cFin && sFin > cInicio;
        });

        slots.push({
          horaInicio: this.formatTime(slotInicio),
          horaFin: this.formatTime(slotFin),
          disponible: !ocupado,
        });
      }
    }

    return { slots };
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
    const citas = await this.prisma.cita.findMany({
      where: {
        consultorioId,
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
