import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  findAllEspecies() {
    return this.prisma.especie.findMany({ orderBy: { nombre: 'asc' } });
  }

  findAllRazas(especieId?: string) {
    return this.prisma.raza.findMany({
      where: especieId ? { especieId } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  findAllColores() {
    return this.prisma.color.findMany({ orderBy: { nombre: 'asc' } });
  }

  findAllTiposPelo() {
    return this.prisma.tipoPelo.findMany({ orderBy: { nombre: 'asc' } });
  }

  findAllPatronesPelo() {
    return this.prisma.patronPelo.findMany({ orderBy: { nombre: 'asc' } });
  }

  findAllComportamientos() {
    return this.prisma.comportamiento.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  findAllAlergias() {
    return this.prisma.catalogoAlergia.findMany({
      orderBy: { nombre: 'asc' },
    });
  }
}
