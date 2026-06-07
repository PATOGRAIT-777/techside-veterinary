import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FolioGenerator {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    const today = new Date();
    const datePrefix = `VET-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-`;

    const lastPago = await this.prisma.pago.findFirst({
      where: {
        folioPago: { startsWith: datePrefix },
      },
      orderBy: {
        folioPago: 'desc',
      },
    });

    let nextSuffix: string;
    if (lastPago) {
      const lastSuffix = parseInt(lastPago.folioPago.slice(-4), 10);
      nextSuffix = String(lastSuffix + 1).padStart(4, '0');
    } else {
      nextSuffix = '0001';
    }

    return `${datePrefix}${nextSuffix}`;
  }

  async generateWithRetry(
    tx: {
      pago: {
        create: (args: { data: { folioPago: string } }) => Promise<unknown>;
      };
    },
    maxRetries = 3,
  ): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const folio = await this.generate();
      try {
        await tx.pago.create({
          data: { folioPago: folio },
        });
        return folio;
      } catch (e) {
        const err = e as { code?: string };
        if (err.code === 'P2002' && i < maxRetries - 1) {
          continue;
        }
        throw e;
      }
    }
    throw new Error(
      'No se pudo generar un folio único después de varios intentos',
    );
  }
}
