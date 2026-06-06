import { Test, TestingModule } from '@nestjs/testing';
import { PagosService } from './pagos.service';
import { PrismaService } from '../prisma/prisma.service';
import { EstadoPago, EstadoCita } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('PagosService', () => {
  let service: PagosService;
  let mockPrisma: {
    pago: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    cita: {
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    mockPrisma = {
      pago: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      cita: {
        update: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PagosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PagosService>(PagosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (payment simulation)', () => {
    it('should process payment successfully', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0001',
        estado: EstadoPago.pendiente,
        citaId: 'cita-1',
        cita: { estado: EstadoCita.pendiente_de_pago },
      });
      mockPrisma.pago.update.mockResolvedValue({
        id: 'pago-1',
        estado: EstadoPago.pagada,
        fechaPago: new Date(),
      });
      mockPrisma.cita.update.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente,
      });

      const result = await service.create({
        folioPago: 'VET-20260606-0001',
      });

      expect(result.estado).toBe(EstadoPago.pagada);
      expect(mockPrisma.pago.update).toHaveBeenCalled();
      expect(mockPrisma.cita.update).toHaveBeenCalled();
    });

    it('should reject paying an already paid folio', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0001',
        estado: EstadoPago.pagada,
      });

      await expect(
        service.create({ folioPago: 'VET-20260606-0001' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject paying a cancelled folio', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0001',
        estado: EstadoPago.cancelada,
      });

      await expect(
        service.create({ folioPago: 'VET-20260606-0001' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should return 404 for non-existent folio', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ folioPago: 'VET-19990101-9999' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByFolio', () => {
    it('should return payment by folio', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0001',
        estado: EstadoPago.pendiente,
      });

      const result = await service.findByFolio('VET-20260606-0001');
      expect(result.folioPago).toBe('VET-20260606-0001');
    });

    it('should return 404 for non-existent folio', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(null);

      await expect(service.findByFolio('VET-19990101-9999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
