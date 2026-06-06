import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiaSemana, EstadoAsistencia, Prisma, Rol } from '@prisma/client';
import { CreateMedicoDto } from './dto/create-medico.dto';
import { UpdateMedicoDto } from './dto/update-medico.dto';
import { CreateMedicoHorarioDto } from './dto/create-medico-horario.dto';
import { UpdateMedicoHorarioDto } from './dto/update-medico-horario.dto';
import { CreateMedicoAsistenciaDto } from './dto/create-medico-asistencia.dto';
import { AvailabilityCalculator } from '../citas/helpers/availability-calculator';

@Injectable()
export class MedicosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly availability: AvailabilityCalculator,
  ) {}

  // =================== Médicos ===================

  async create(dto: CreateMedicoDto) {
    // Verificar que el usuario existe y tiene rol médico
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: dto.usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol !== Rol.medico) {
      throw new BadRequestException('El usuario debe tener rol de médico');
    }

    // Verificar que no existe otro médico para este usuario
    const existente = await this.prisma.medico.findFirst({
      where: { usuarioId: dto.usuarioId },
    });
    if (existente) {
      throw new ConflictException('Este usuario ya tiene un perfil de médico');
    }

    return this.prisma.medico.create({
      data: {
        usuarioId: dto.usuarioId,
        sucursalId: dto.sucursalId,
        especialidadPrincipalId: dto.especialidadPrincipalId,
        cedulaProfesional: dto.cedulaProfesional,
        biografiaCorta: dto.biografiaCorta,
      },
      include: {
        usuario: { include: { persona: true } },
        sucursal: true,
        especialidadPrincipal: true,
      },
    });
  }

  async findAll() {
    return this.prisma.medico.findMany({
      include: {
        usuario: { include: { persona: true } },
        sucursal: true,
        especialidadPrincipal: true,
        horarios: true,
      },
    });
  }

  async findFiltered(query: { especialidadId?: string; sucursalId?: string }) {
    const where: Record<string, unknown> = {};

    if (query.especialidadId) {
      where.especialidadPrincipalId = query.especialidadId;
    }

    const medicos = await this.prisma.medico.findMany({
      where,
      include: {
        usuario: { include: { persona: true } },
        sucursal: true,
        especialidadPrincipal: true,
      },
    });

    if (query.sucursalId) {
      // Sort: matching sucursal first
      return medicos.sort((a, b) => {
        const aMatch = a.sucursalId === query.sucursalId ? -1 : 1;
        const bMatch = b.sucursalId === query.sucursalId ? -1 : 1;
        return aMatch - bMatch;
      });
    }

    return medicos;
  }

  async disponibilidadDias(
    medicoId: string,
    desdeStr: string,
    hastaStr: string,
  ) {
    const desde = this.parseDate(desdeStr);
    const hasta = this.parseDate(hastaStr);
    const ahora = new Date();

    const minDesde = new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    if (desde < minDesde) {
      throw new BadRequestException(
        'La fecha desde debe ser al menos 24 horas en el futuro',
      );
    }

    const diffDias =
      (hasta.getTime() - desde.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDias > 60) {
      throw new BadRequestException(
        'El rango máximo de consulta es de 60 días',
      );
    }

    const maxHasta = new Date(ahora);
    maxHasta.setMonth(maxHasta.getMonth() + 2);
    if (hasta > maxHasta) {
      throw new BadRequestException(
        'No se puede consultar disponibilidad con más de 2 meses de anticipación',
      );
    }

    return this.availability.computeDays(medicoId, desde, hasta);
  }

  async disponibilidadSlots(medicoId: string, fechaStr: string) {
    const fecha = this.parseDate(fechaStr);
    return this.availability.computeSlots(medicoId, fecha);
  }

  async findOne(id: string) {
    const medico = await this.prisma.medico.findUnique({
      where: { id },
      include: {
        usuario: { include: { persona: true } },
        sucursal: true,
        especialidadPrincipal: true,
        horarios: true,
      },
    });
    if (!medico) {
      throw new NotFoundException('Médico no encontrado');
    }
    return medico;
  }

  async update(id: string, dto: UpdateMedicoDto) {
    await this.findOne(id);

    return this.prisma.medico.update({
      where: { id },
      data: dto,
      include: {
        usuario: { include: { persona: true } },
        sucursal: true,
        especialidadPrincipal: true,
      },
    });
  }

  // =================== Horarios ===================

  async crearHorario(medicoId: string, dto: CreateMedicoHorarioDto) {
    // Verificar que el médico existe
    await this.findOne(medicoId);

    const horaInicio = this.parseTime(dto.horaInicio);
    const horaFin = this.parseTime(dto.horaFin);

    // Validar franjas horarias
    this.validarFranjaHoraria(dto.diaSemana, horaInicio, horaFin);

    // Verificar que no existe horario con la misma hora de inicio
    const existente = await this.prisma.medicoHorario.findFirst({
      where: {
        medicoId,
        diaSemana: dto.diaSemana,
        horaInicio,
      },
    });
    if (existente) {
      throw new ConflictException(
        'Ya existe un horario para este médico en ese día y hora',
      );
    }

    // Verificar que el consultorio existe
    const consultorio = await this.prisma.consultorio.findUnique({
      where: { id: dto.consultorioId },
    });
    if (!consultorio) {
      throw new NotFoundException('Consultorio no encontrado');
    }

    // Verificar traslape con horarios existentes
    const horariosExistentes = await this.prisma.medicoHorario.findMany({
      where: {
        medicoId,
        diaSemana: dto.diaSemana,
      },
    });

    const inicioMin = this.timeToMinutes(horaInicio);
    const finMin = this.timeToMinutes(horaFin);

    for (const h of horariosExistentes) {
      const hInicio = this.timeToMinutes(h.horaInicio);
      const hFin = this.timeToMinutes(h.horaFin);
      if (inicioMin < hFin && finMin > hInicio) {
        throw new ConflictException(
          'El horario se traslapa con otro existente',
        );
      }
    }

    return this.prisma.medicoHorario.create({
      data: {
        medicoId,
        diaSemana: dto.diaSemana,
        horaInicio,
        horaFin,
        consultorioId: dto.consultorioId,
      },
    });
  }

  async listarHorarios(medicoId: string) {
    await this.findOne(medicoId);

    return this.prisma.medicoHorario.findMany({
      where: { medicoId },
      orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
    });
  }

  async actualizarHorario(
    medicoId: string,
    horarioId: string,
    dto: UpdateMedicoHorarioDto,
  ) {
    await this.findOne(medicoId);

    const horario = await this.prisma.medicoHorario.findFirst({
      where: { id: horarioId, medicoId },
    });
    if (!horario) {
      throw new NotFoundException('Horario no encontrado');
    }

    const data: Prisma.MedicoHorarioUpdateInput = {};

    if (dto.diaSemana) data.diaSemana = dto.diaSemana;

    if (dto.horaInicio || dto.horaFin) {
      const horaInicio = dto.horaInicio
        ? this.parseTime(dto.horaInicio)
        : horario.horaInicio;
      const horaFin = dto.horaFin
        ? this.parseTime(dto.horaFin)
        : horario.horaFin;

      data.horaInicio = horaInicio;
      data.horaFin = horaFin;

      // Revalidar traslape si cambió hora o día
      const diaSemanaQuery: DiaSemana = dto.diaSemana || horario.diaSemana;
      const horariosExistentes = await this.prisma.medicoHorario.findMany({
        where: {
          medicoId,
          diaSemana: diaSemanaQuery,
          id: { not: horarioId },
        },
      });

      const inicioMin = this.timeToMinutes(horaInicio);
      const finMin = this.timeToMinutes(horaFin);

      for (const h of horariosExistentes) {
        const hInicio = this.timeToMinutes(h.horaInicio);
        const hFin = this.timeToMinutes(h.horaFin);
        if (inicioMin < hFin && finMin > hInicio) {
          throw new ConflictException(
            'El horario se traslapa con otro existente',
          );
        }
      }
    }

    return this.prisma.medicoHorario.update({
      where: { id: horarioId },
      data,
    });
  }

  async eliminarHorario(medicoId: string, horarioId: string) {
    await this.findOne(medicoId);

    const horario = await this.prisma.medicoHorario.findFirst({
      where: { id: horarioId, medicoId },
    });
    if (!horario) {
      throw new NotFoundException('Horario no encontrado');
    }

    return this.prisma.medicoHorario.delete({ where: { id: horarioId } });
  }

  // =================== Asistencias ===================

  async registrarAsistenciaManual(
    medicoId: string,
    dto: CreateMedicoAsistenciaDto,
  ) {
    await this.findOne(medicoId);

    const fecha = new Date(dto.fecha + 'T00:00:00');

    // Verificar que no existe asistencia para esa fecha
    const existente = await this.prisma.medicoAsistencia.findUnique({
      where: { medicoId_fecha: { medicoId, fecha } },
    });
    if (existente) {
      throw new ConflictException(
        'Ya existe un registro de asistencia para este médico en esta fecha',
      );
    }

    const data: Prisma.MedicoAsistenciaCreateInput = {
      medico: { connect: { id: medicoId } },
      fecha,
      estado: dto.estado,
      observaciones: dto.observaciones,
    };

    if (dto.horaEntradaReal) {
      data.horaEntradaReal = this.parseTime(dto.horaEntradaReal);
    }
    if (dto.horaSalidaReal) {
      data.horaSalidaReal = this.parseTime(dto.horaSalidaReal);
    }

    return this.prisma.medicoAsistencia.create({ data });
  }

  async listarAsistencias(medicoId: string, desde?: string, hasta?: string) {
    await this.findOne(medicoId);

    const where: Record<string, unknown> = { medicoId };

    if (desde || hasta) {
      where.fecha = {};
      if (desde)
        (where.fecha as Record<string, Date>).gte = new Date(
          desde + 'T00:00:00',
        );
      if (hasta)
        (where.fecha as Record<string, Date>).lte = new Date(
          hasta + 'T00:00:00',
        );
    }

    return this.prisma.medicoAsistencia.findMany({
      where,
      orderBy: { fecha: 'desc' },
    });
  }

  async registrarEntradaAutomatica(medicoId: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Verificar si ya existe asistencia para hoy
    const existente = await this.prisma.medicoAsistencia.findUnique({
      where: { medicoId_fecha: { medicoId, fecha: hoy } },
    });

    if (existente) {
      // Ya checó entrada, no hacer nada
      return existente;
    }

    // Verificar si hoy es día laboral del médico
    const diaSemana = hoy.getDay();
    const dias = [
      'domingo',
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
      'sabado',
    ] as const;
    const diaNombre = dias[diaSemana];

    const horarios = await this.prisma.medicoHorario.findMany({
      where: { medicoId, diaSemana: diaNombre },
    });

    if (horarios.length === 0) {
      // No es día laboral, no registrar asistencia
      return null;
    }

    // Registrar entrada
    const ahora = new Date();
    const horaEntrada = new Date(
      1970,
      0,
      1,
      ahora.getHours(),
      ahora.getMinutes(),
    );

    return this.prisma.medicoAsistencia.create({
      data: {
        medicoId,
        fecha: hoy,
        horaEntradaReal: horaEntrada,
        estado: EstadoAsistencia.asistencia,
      },
    });
  }

  async marcarSalida(medicoId: string) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const asistencia = await this.prisma.medicoAsistencia.findUnique({
      where: { medicoId_fecha: { medicoId, fecha: hoy } },
    });

    if (!asistencia) {
      throw new BadRequestException(
        'No existe un registro de entrada para hoy',
      );
    }

    const ahora = new Date();
    const horaSalida = new Date(
      1970,
      0,
      1,
      ahora.getHours(),
      ahora.getMinutes(),
    );

    return this.prisma.medicoAsistencia.update({
      where: { id: asistencia.id },
      data: { horaSalidaReal: horaSalida },
    });
  }

  private validarFranjaHoraria(
    diaSemana: string,
    horaInicio: Date,
    horaFin: Date,
  ) {
    const diasEntreSemana = [
      'lunes',
      'martes',
      'miercoles',
      'jueves',
      'viernes',
    ];
    const diasFinSemana = ['sabado', 'domingo'];

    const inicio = parseInt(
      `${String(horaInicio.getHours()).padStart(2, '0')}${String(horaInicio.getMinutes()).padStart(2, '0')}`,
    );
    const fin = parseInt(
      `${String(horaFin.getHours()).padStart(2, '0')}${String(horaFin.getMinutes()).padStart(2, '0')}`,
    );

    if (diasEntreSemana.includes(diaSemana)) {
      const franja1 = inicio >= 700 && fin <= 1400;
      const franja2 = inicio >= 1400 && fin <= 2100;
      if (!franja1 && !franja2) {
        throw new BadRequestException(
          'Franja no válida. Entre semana: 07:00-14:00 o 14:00-21:00',
        );
      }
    } else if (diasFinSemana.includes(diaSemana)) {
      if (!(inicio >= 700 && fin <= 2300)) {
        throw new BadRequestException(
          'Franja no válida. Fin de semana: 07:00-23:00',
        );
      }
    }
  }

  // =================== Helpers ===================

  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private parseTime(timeStr: string): Date {
    const [hora, minuto] = timeStr.split(':').map(Number);
    return new Date(1970, 0, 1, hora, minuto);
  }

  private timeToMinutes(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }
}
