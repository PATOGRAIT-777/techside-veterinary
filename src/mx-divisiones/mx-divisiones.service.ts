import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MxDivision, Sucursal } from '@prisma/client';

@Injectable()
export class MxDivisionesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MxDivision[]> {
    return this.prisma.mxDivision.findMany({
      where: { activo: true },
    });
  }

  async findById(id: string): Promise<MxDivision> {
    const division = await this.prisma.mxDivision.findFirst({
      where: { id, activo: true },
    });
    if (!division) {
      throw new NotFoundException('Sucursal no encontrada');
    }
    return division;
  }

  async findSucursales(): Promise<Pick<Sucursal, 'id' | 'nombre'>[]> {
    return this.prisma.sucursal.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }
}
