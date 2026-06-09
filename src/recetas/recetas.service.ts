import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, Rol } from '@prisma/client';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CitaCompletionService } from '../citas/cita-completion.service';
import { recetaInclude, mapRecetaToResponse } from './recetas.mapper';

@Injectable()
export class RecetasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly citaCompletionService: CitaCompletionService,
  ) {}

  async create(dto: CreateRecetaDto, usuario: JwtPayload) {
    // Buscar la cita
    const cita = await this.prisma.cita.findUnique({
      where: { id: dto.citaId },
      include: { mascota: true },
    });
    if (!cita) {
      throw new NotFoundException('Cita no encontrada');
    }

    // Verificar que la cita esté en curso
    if (cita.estado !== EstadoCita.en_curso) {
      throw new ForbiddenException(
        'La cita debe estar en curso para generar una receta',
      );
    }

    // Verificar que el médico sea el de la cita
    if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== cita.medicoId) {
        throw new ForbiddenException(
          'Solo el médico asignado puede generar la receta',
        );
      }
    } else if (usuario.rol === Rol.cliente) {
      throw new ForbiddenException('Los clientes no pueden generar recetas');
    }

    // Verificar que no existe receta para esta cita
    const existente = await this.prisma.receta.findUnique({
      where: { citaId: dto.citaId },
    });
    if (existente) {
      throw new ForbiddenException('Esta cita ya tiene una receta generada');
    }

    // Transacción: crear receta + detalles
    const receta = await this.prisma.$transaction(async (tx) => {
      const nuevaReceta = await tx.receta.create({
        data: {
          citaId: dto.citaId,
          medicoId: cita.medicoId,
          diagnostico: dto.diagnostico,
          observaciones: dto.observaciones,
          fechaReceta: new Date(),
          detalles: {
            create: dto.detalles.map((d) => ({
              medicamento: d.medicamento,
              dosis: d.dosis,
              frecuencia: d.frecuencia,
              duracion: d.duracion,
              viaAdministracion: d.viaAdministracion,
              instrucciones: d.instrucciones,
            })),
          },
        },
        include: recetaInclude,
      });

      return nuevaReceta;
    });

    // Side-effect: completar cita si ya existe consulta
    await this.citaCompletionService.checkAndComplete(dto.citaId);

    return mapRecetaToResponse(receta);
  }

  async findAll(usuario: JwtPayload) {
    const where: Record<string, unknown> = {};

    if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico) {
        where.medicoId = medico.id;
      } else {
        return [];
      }
    } else if (usuario.rol === Rol.cliente) {
      // Cliente ve recetas de sus mascotas
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

    const recetas = await this.prisma.receta.findMany({
      where,
      include: recetaInclude,
      orderBy: { fechaReceta: 'desc' },
    });
    return recetas.map(mapRecetaToResponse);
  }

  async findOne(id: string, usuario: JwtPayload) {
    const receta = await this.prisma.receta.findUnique({
      where: { id },
      include: recetaInclude,
    });
    if (!receta) {
      throw new NotFoundException('Receta no encontrada');
    }

    // Verificar permisos
    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: receta.cita.mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException('No tiene permiso para ver esta receta');
      }
    } else if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== receta.medicoId) {
        throw new ForbiddenException('No tiene permiso para ver esta receta');
      }
    }

    return mapRecetaToResponse(receta);
  }

  async findByCita(citaId: string, usuario: JwtPayload) {
    const receta = await this.prisma.receta.findUnique({
      where: { citaId },
      include: recetaInclude,
    });
    if (!receta) {
      throw new NotFoundException('Receta no encontrada');
    }

    // Verificar permisos
    if (usuario.rol === Rol.cliente) {
      const mascota = await this.prisma.mascota.findUnique({
        where: { id: receta.cita.mascotaId },
      });
      if (mascota?.propietarioId !== usuario.sub) {
        throw new ForbiddenException('No tiene permiso para ver esta receta');
      }
    } else if (usuario.rol === Rol.medico) {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: usuario.sub },
      });
      if (medico?.id !== receta.medicoId) {
        throw new ForbiddenException('No tiene permiso para ver esta receta');
      }
    }

    return mapRecetaToResponse(receta);
  }
}
