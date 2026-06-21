import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, EstadoPago, Prisma, Rol } from '@prisma/client';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CitaEstadoHistorialService } from '../citas/cita-estado-historial.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { BuscarPagosQueryDto } from './dto/buscar-pagos-query.dto';
import {
  mapPagoToResponse,
  PaginatedPagosResponseDto,
  pagoInclude,
} from './dto/pago-response.dto';

const MEDICO_VISIBLE_ESTADOS_CITA: EstadoCita[] = [
  EstadoCita.pendiente,
  EstadoCita.en_curso,
  EstadoCita.completada,
  EstadoCita.cancelada,
];

@Injectable()
export class PagosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly historialService: CitaEstadoHistorialService,
  ) {}

  async create(dto: CreatePagoDto) {
    const pago = await this.prisma.pago.findUnique({
      where: { folioPago: dto.folioPago },
      include: { cita: true },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (pago.estado === EstadoPago.pagada) {
      throw new ConflictException('El pago ya fue procesado');
    }

    if (pago.estado === EstadoPago.cancelada) {
      throw new ConflictException('El pago fue cancelado');
    }

    // Transaction: update Pago + update Cita estado
    const [updatedPago] = await this.prisma.$transaction([
      this.prisma.pago.update({
        where: { id: pago.id },
        data: {
          estado: EstadoPago.pagada,
          fechaPago: new Date(),
        },
      }),
      this.prisma.cita.update({
        where: { id: pago.citaId },
        data: { estado: EstadoCita.pendiente },
      }),
    ]);

    // Registrar transición de estado en audit log
    await this.historialService.registrarCambio(
      pago.citaId,
      EstadoCita.pendiente_de_pago,
      EstadoCita.pendiente,
      null,
      null,
    );

    return updatedPago;
  }

  async findAll(
    query: BuscarPagosQueryDto,
    usuario: JwtPayload,
  ): Promise<PaginatedPagosResponseDto> {
    if (!this.isKnownRole(usuario.rol)) {
      return {
        data: [],
        meta: { total: 0, limit: query.limit, offset: query.offset },
      };
    }

    const where = this.buildWhereForUser(usuario, query.estado);

    const [total, pagos] = await Promise.all([
      this.prisma.pago.count({ where }),
      this.prisma.pago.findMany({
        where,
        include: pagoInclude,
        orderBy: { createdAt: 'desc' },
        skip: query.offset,
        take: query.limit,
      }),
    ]);

    return {
      data: pagos.map(mapPagoToResponse),
      meta: {
        total,
        limit: query.limit,
        offset: query.offset,
      },
    };
  }

  async findByFolio(folioPago: string, usuario: JwtPayload) {
    const pago = await this.prisma.pago.findUnique({
      where: { folioPago },
      include: pagoInclude,
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    if (usuario.rol === Rol.cliente) {
      if (pago.cita.mascota.propietarioId !== usuario.sub) {
        throw new NotFoundException('Pago no encontrado');
      }
    } else if (usuario.rol === Rol.medico) {
      if (
        !MEDICO_VISIBLE_ESTADOS_CITA.includes(pago.cita.estado) ||
        pago.cita.medico.usuarioId !== usuario.sub
      ) {
        throw new NotFoundException('Pago no encontrado');
      }
    } else if (usuario.rol !== Rol.admin) {
      throw new NotFoundException('Pago no encontrado');
    }

    return mapPagoToResponse(pago);
  }

  private isKnownRole(rol: string): boolean {
    return rol === Rol.cliente || rol === Rol.medico || rol === Rol.admin;
  }

  private buildWhereForUser(
    usuario: JwtPayload,
    estado?: EstadoPago,
  ): Prisma.PagoWhereInput {
    const where: Prisma.PagoWhereInput = {};

    if (usuario.rol === Rol.cliente) {
      where.cita = {
        mascota: { propietarioId: usuario.sub },
      };
    } else if (usuario.rol === Rol.medico) {
      where.cita = {
        medico: { usuarioId: usuario.sub },
        estado: { in: MEDICO_VISIBLE_ESTADOS_CITA },
      };
    }

    if (estado && where.cita) {
      where.AND = [{ cita: where.cita }, { estado }];
      delete where.cita;
    } else if (estado) {
      where.estado = estado;
    }

    return where;
  }
}
