import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoCita, EstadoPago } from '@prisma/client';
import { CreatePagoDto } from './dto/create-pago.dto';
import { CitaEstadoHistorialService } from '../citas/cita-estado-historial.service';

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

  async findByFolio(folioPago: string) {
    const pago = await this.prisma.pago.findUnique({
      where: { folioPago },
      include: { cita: true },
    });

    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return pago;
  }
}
