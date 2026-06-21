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
    currentUser: JwtPayload,
  ): Promise<PaginatedPagosResponseDto> {
    if (!this.isKnownRole(currentUser.rol)) {
      return {
        data: [],
        meta: { total: 0, limit: query.limit, offset: query.offset },
      };
    }

    const where = this.buildWhereForUser(currentUser, query.estado);

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

  async findByFolio(folioPago: string, currentUser: JwtPayload) {
    const pago = await this.prisma.pago.findUnique({
      where: { folioPago },
      include: pagoInclude,
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    this.ensureFolioAuthorized(pago, currentUser);

    return mapPagoToResponse(pago);
  }

  private isKnownRole(rol: string): boolean {
    return rol === Rol.cliente || rol === Rol.medico || rol === Rol.admin;
  }

  private ensureFolioAuthorized(
    pago: Prisma.PagoGetPayload<{ include: typeof pagoInclude }>,
    currentUser: JwtPayload,
  ): void {
    if (currentUser.rol === Rol.cliente) {
      if (pago.cita.mascota.propietarioId !== currentUser.sub) {
        throw new NotFoundException('Pago no encontrado');
      }
      return;
    }

    if (currentUser.rol === Rol.medico) {
      if (
        !MEDICO_VISIBLE_ESTADOS_CITA.includes(pago.cita.estado) ||
        pago.cita.medico.usuarioId !== currentUser.sub
      ) {
        throw new NotFoundException('Pago no encontrado');
      }
      return;
    }

    if (currentUser.rol !== Rol.admin) {
      throw new NotFoundException('Pago no encontrado');
    }
  }

  private buildWhereForUser(
    currentUser: JwtPayload,
    estado?: EstadoPago,
  ): Prisma.PagoWhereInput {
    const roleFilter: Prisma.PagoWhereInput[] = [];

    if (currentUser.rol === Rol.cliente) {
      roleFilter.push({
        cita: { mascota: { propietarioId: currentUser.sub } },
      });
    } else if (currentUser.rol === Rol.medico) {
      roleFilter.push({
        cita: {
          medico: { usuarioId: currentUser.sub },
          estado: { in: MEDICO_VISIBLE_ESTADOS_CITA },
        },
      });
    }

    if (estado) {
      roleFilter.push({ estado });
    }

    return roleFilter.length > 0 ? { AND: roleFilter } : {};
  }
}
