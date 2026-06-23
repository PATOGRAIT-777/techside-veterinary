import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoOrden, EstadoCita } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // src/dashboard/dashboard.service.ts
async getStats() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const [citasHoy, totalPacientes, ordenesPendientes, stockResult] = await Promise.all([
            this.prisma.cita.count({ where: { fecha: { gte: hoy } } }),
            this.prisma.mascota.count(),
            this.prisma.orden.count({ where: { estado: EstadoOrden.pendiente_pago } }),
            this.prisma.inventarioSucursal.aggregate({ _sum: { cantidadExistencia: true } })
        ]);

        return {
            citasHoy: citasHoy || 0,
            totalPacientes: totalPacientes || 0,
            ordenesPendientes: ordenesPendientes || 0,
            productosStock: stockResult._sum.cantidadExistencia || 0
        };
    } catch (error) {
        console.error(error);
        return { citasHoy: 0, totalPacientes: 0, ordenesPendientes: 0, productosStock: 0 };
    }
}
}