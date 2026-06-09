import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, Rol } from '@prisma/client';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CitaCompletionService } from '../citas/cita-completion.service';
import { consultaInclude, mapConsultaToResponse } from './consultas.mapper';

@Injectable()
export class ConsultasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citaCompletionService: CitaCompletionService,
  ) {}

  async create(dto: CreateConsultaDto, usuario: JwtPayload) {
    // Verificar que la cita existe y está en curso o completada
    const cita = await this.prisma.cita.findUnique({
      where: { id: dto.citaId },
      include: { mascota: true },
    });
    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    if (
      cita.estado !== EstadoCita.en_curso &&
      cita.estado !== EstadoCita.completada
    ) {
      throw new ForbiddenException(
        'La cita debe estar en curso o completada para registrar consulta',
      );
    }

    // Verificar que el médico sea el de la cita
    if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== cita.medicoId) {
        throw new ForbiddenException(
          'Solo el médico asignado puede registrar la consulta',
        );
      }
    } else if (usuario.rol === Rol.cliente) {
      throw new ForbiddenException(
        'Los clientes no pueden registrar consultas',
      );
    }

    // Verificar que no existe consulta para esta cita
    const existente = await this.prisma.consulta.findUnique({
      where: { citaId: dto.citaId },
    });
    if (existente) {
      throw new ForbiddenException(
        'Esta cita ya tiene una consulta registrada',
      );
    }

    const consulta = await this.prisma.consulta.create({
      data: {
        citaId: dto.citaId,
        peso: dto.peso,
        temperatura: dto.temperatura,
        frecuenciaCardiaca: dto.frecuenciaCardiaca,
        frecuenciaRespiratoria: dto.frecuenciaRespiratoria,
        presionArterial: dto.presionArterial,
        estadoGeneral: dto.estadoGeneral,
        notasEvolucion: dto.notasEvolucion,
      },
      include: consultaInclude,
    });

    // Side-effect: completar cita si ya existe receta
    await this.citaCompletionService.checkAndComplete(dto.citaId);

    return mapConsultaToResponse(consulta);
  }

  async findAll(usuario: JwtPayload) {
    const where: Record<string, unknown> = {};

    if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico) {
        const citas = await this.prisma.cita.findMany({
          where: { medicoId: medico.id },
          select: { id: true },
        });
        const citaIds = citas.map((c) => c.id);
        where.citaId = { in: citaIds };
      } else {
        return [];
      }
    } else if (usuario.rol === Rol.cliente) {
      const mascotas = await this.prisma.mascota.findMany({
        where: { propietarioId: usuario.sub },
        select: { id: true },
      });
      const mascotaIds = mascotas.map((m) => m.id);

      const citas = await this.prisma.cita.findMany({
        where: { mascotaId: { in: mascotaIds } },
        select: { id: true },
      });
      const citaIds = citas.map((c) => c.id);

      where.citaId = { in: citaIds };
    }

    const consultas = await this.prisma.consulta.findMany({
      where,
      include: consultaInclude,
      orderBy: { cita: { fecha: 'desc' } },
    });

    return consultas.map(mapConsultaToResponse);
  }

  async findOne(id: string, usuario: JwtPayload) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id },
      include: consultaInclude,
    });
    if (!consulta) {
      throw new NotFoundException('Consulta no encontrada');
    }

    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: consulta.cita.mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException('No tiene permiso para ver esta consulta');
      }
    } else if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== consulta.cita.medicoId) {
        throw new ForbiddenException('No tiene permiso para ver esta consulta');
      }
    }

    return mapConsultaToResponse(consulta);
  }

  async findByCita(citaId: string, usuario: JwtPayload) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { citaId },
      include: consultaInclude,
    });
    if (!consulta) {
      throw new NotFoundException('Consulta no encontrada');
    }

    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: consulta.cita.mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException('No tiene permiso para ver esta consulta');
      }
    } else if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== consulta.cita.medicoId) {
        throw new ForbiddenException('No tiene permiso para ver esta consulta');
      }
    }

    return mapConsultaToResponse(consulta);
  }

  async update(id: string, dto: UpdateConsultaDto, usuario: JwtPayload) {
    const consulta = await this.findOneRaw(id, usuario);

    if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== consulta.cita.medicoId) {
        throw new ForbiddenException(
          'No tiene permiso para actualizar esta consulta',
        );
      }
    }

    const updated = await this.prisma.consulta.update({
      where: { id },
      data: dto,
      include: consultaInclude,
    });

    return mapConsultaToResponse(updated);
  }

  // Helper privado para acceso interno que necesita campos crudos (medicoId, mascotaId)
  private async findOneRaw(id: string, usuario: JwtPayload) {
    const consulta = await this.prisma.consulta.findUnique({
      where: { id },
      include: {
        cita: {
          include: {
            mascota: true,
            medico: { include: { usuario: { select: { persona: true } } } },
          },
        },
      },
    });
    if (!consulta) {
      throw new NotFoundException('Consulta no encontrada');
    }

    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: consulta.cita.mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException('No tiene permiso para ver esta consulta');
      }
    } else if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== consulta.cita.medicoId) {
        throw new ForbiddenException('No tiene permiso para ver esta consulta');
      }
    }

    return consulta;
  }
}
