import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MxDivision, Sucursal } from '@prisma/client';

@Injectable()
export class MxDivisionesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<MxDivision[]> {
    // MxDivision ahora es un catálogo SEPOMEX, ya no usamos "activo: true"
    return this.prisma.mxDivision.findMany();
  }

  async findById(id: string): Promise<MxDivision> {
    // Buscamos por ID sin el filtro "activo"
    const division = await this.prisma.mxDivision.findUnique({
      where: { id },
    });
    
    if (!division) {
      throw new NotFoundException('Código Postal o División no encontrada');
    }
    return division;
  }

  async findSucursales(): Promise<Pick<Sucursal, 'id' | 'nombre'>[]> {
    // La tabla Sucursales SÍ conserva su campo "activo", así que lo mantenemos igual
    return this.prisma.sucursal.findMany({
      where: { activo: true },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  }
}