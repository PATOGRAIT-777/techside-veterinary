import { Test, TestingModule } from '@nestjs/testing';
import { PagosService } from './pagos.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitaEstadoHistorialService } from '../citas/cita-estado-historial.service';
import { EstadoPago, EstadoCita, Rol } from '@prisma/client';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PagoWithRelations } from './dto/pago-response.dto';

describe('PagosService', () => {
  let service: PagosService;
  const mockHistorialService = {
    registrarCambio: jest.fn(),
  };
  let mockPrisma: {
    pago: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    cita: {
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const clienteUser: JwtPayload = {
    sub: 'cliente-1',
    email: 'cliente@test.com',
    rol: Rol.cliente,
  };

  const medicoUser: JwtPayload = {
    sub: 'medico-1',
    email: 'medico@test.com',
    rol: Rol.medico,
  };

  const adminUser: JwtPayload = {
    sub: 'admin-1',
    email: 'admin@test.com',
    rol: Rol.admin,
  };

  const unknownUser: JwtPayload = {
    sub: 'unknown-1',
    email: 'unknown@test.com',
    rol: 'unknown' as Rol,
  };

  const baseCita: PagoWithRelations['cita'] = {
    id: 'cita-1',
    estado: EstadoCita.pendiente,
    fecha: new Date('2026-06-06'),
    horaInicio: new Date('2026-06-06T10:00:00Z'),
    mascota: {
      id: 'mascota-1',
      nombre: 'Firulais',
      propietarioId: 'cliente-1',
    },
    servicio: { id: 'servicio-1', nombre: 'Consulta general' },
    sucursal: { id: 'sucursal-1', nombre: 'Sucursal Norte' },
    medico: {
      id: 'medico-1',
      usuarioId: 'medico-1',
      usuario: { persona: { nombreCompleto: 'Dr. House' } },
    },
  } as unknown as PagoWithRelations['cita'];

  const basePago = (
    overrides?: Partial<PagoWithRelations>,
  ): PagoWithRelations => ({
    id: 'pago-1',
    folioPago: 'VET-20260606-0001',
    cantidad: 1000 as unknown as never,
    estado: EstadoPago.pendiente,
    citaId: 'cita-1',
    fechaPago: null,
    createdAt: new Date('2026-06-06T10:00:00Z'),
    updatedAt: new Date('2026-06-06T10:00:00Z'),
    cita: baseCita,
    ...overrides,
  });

  beforeEach(async () => {
    mockPrisma = {
      pago: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
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
        { provide: CitaEstadoHistorialService, useValue: mockHistorialService },
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
      expect(mockHistorialService.registrarCambio).toHaveBeenCalledWith(
        'cita-1',
        EstadoCita.pendiente_de_pago,
        EstadoCita.pendiente,
        null,
        null,
      );
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

  describe('findAll', () => {
    it('should return only own payments for cliente', async () => {
      mockPrisma.pago.count.mockResolvedValue(1);
      mockPrisma.pago.findMany.mockResolvedValue([basePago()]);

      const result = await service.findAll(
        { limit: 20, offset: 0 },
        clienteUser,
      );

      expect(mockPrisma.pago.count).toHaveBeenCalledWith({
        where: {
          AND: [{ cita: { mascota: { propietarioId: 'cliente-1' } } }],
        },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].cita.mascota.nombre).toBe('Firulais');
    });

    it('should return only allowed-state payments for medico', async () => {
      mockPrisma.pago.count.mockResolvedValue(1);
      mockPrisma.pago.findMany.mockResolvedValue([basePago()]);

      const result = await service.findAll(
        { limit: 20, offset: 0 },
        medicoUser,
      );

      expect(mockPrisma.pago.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              cita: {
                medico: { usuarioId: 'medico-1' },
                estado: {
                  in: [
                    EstadoCita.pendiente,
                    EstadoCita.en_curso,
                    EstadoCita.completada,
                    EstadoCita.cancelada,
                  ],
                },
              },
            },
          ],
        },
      });
      expect(result.data).toHaveLength(1);
    });

    it('should return empty list for medico when Prisma returns no rows', async () => {
      mockPrisma.pago.count.mockResolvedValue(0);
      mockPrisma.pago.findMany.mockResolvedValue([]);

      const result = await service.findAll(
        { limit: 20, offset: 0 },
        medicoUser,
      );

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should return all payments for admin', async () => {
      mockPrisma.pago.count.mockResolvedValue(2);
      mockPrisma.pago.findMany.mockResolvedValue([
        basePago({ id: 'pago-1' }),
        basePago({ id: 'pago-2' }),
      ]);

      const result = await service.findAll({ limit: 20, offset: 0 }, adminUser);

      expect(mockPrisma.pago.count).toHaveBeenCalledWith({ where: {} });
      expect(result.data).toHaveLength(2);
    });

    it('should compose estado filter with cliente role filter', async () => {
      mockPrisma.pago.count.mockResolvedValue(1);
      mockPrisma.pago.findMany.mockResolvedValue([basePago()]);

      await service.findAll(
        { estado: EstadoPago.pagada, limit: 20, offset: 0 },
        clienteUser,
      );

      expect(mockPrisma.pago.count).toHaveBeenCalledWith({
        where: {
          AND: [
            { cita: { mascota: { propietarioId: 'cliente-1' } } },
            { estado: EstadoPago.pagada },
          ],
        },
      });
    });

    it('should compose estado filter with medico role filter', async () => {
      mockPrisma.pago.count.mockResolvedValue(1);
      mockPrisma.pago.findMany.mockResolvedValue([basePago()]);

      await service.findAll(
        { estado: EstadoPago.pagada, limit: 20, offset: 0 },
        medicoUser,
      );

      expect(mockPrisma.pago.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              cita: {
                medico: { usuarioId: 'medico-1' },
                estado: {
                  in: [
                    EstadoCita.pendiente,
                    EstadoCita.en_curso,
                    EstadoCita.completada,
                    EstadoCita.cancelada,
                  ],
                },
              },
            },
            { estado: EstadoPago.pagada },
          ],
        },
      });
    });

    it('should compose estado filter for admin', async () => {
      mockPrisma.pago.count.mockResolvedValue(1);
      mockPrisma.pago.findMany.mockResolvedValue([basePago()]);

      await service.findAll(
        { estado: EstadoPago.cancelada, limit: 20, offset: 0 },
        adminUser,
      );

      expect(mockPrisma.pago.count).toHaveBeenCalledWith({
        where: { AND: [{ estado: EstadoPago.cancelada }] },
      });
    });

    it('should return correct pagination metadata', async () => {
      mockPrisma.pago.count.mockResolvedValue(42);
      mockPrisma.pago.findMany.mockResolvedValue([basePago()]);

      const result = await service.findAll({ limit: 10, offset: 5 }, adminUser);

      expect(result.meta).toEqual({ total: 42, limit: 10, offset: 5 });
    });

    it('should sort results by createdAt descending', async () => {
      const older = basePago({
        id: 'pago-older',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      });
      const newer = basePago({
        id: 'pago-newer',
        createdAt: new Date('2026-12-31T00:00:00Z'),
      });
      mockPrisma.pago.count.mockResolvedValue(2);
      mockPrisma.pago.findMany.mockResolvedValue([newer, older]);

      const result = await service.findAll({ limit: 20, offset: 0 }, adminUser);

      expect(mockPrisma.pago.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
      );
      expect(result.data[0].id).toBe('pago-newer');
    });

    it('should return empty list for unknown role', async () => {
      const result = await service.findAll(
        { limit: 20, offset: 0 },
        unknownUser,
      );

      expect(mockPrisma.pago.count).not.toHaveBeenCalled();
      expect(mockPrisma.pago.findMany).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });

    it('should return empty list for cliente with no own payments', async () => {
      mockPrisma.pago.count.mockResolvedValue(0);
      mockPrisma.pago.findMany.mockResolvedValue([]);

      const result = await service.findAll(
        { limit: 20, offset: 0 },
        clienteUser,
      );

      expect(result.data).toHaveLength(0);
      expect(result.meta.total).toBe(0);
    });
  });

  describe('findByFolio', () => {
    it('should return payment DTO for authorized cliente', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(basePago());

      const result = await service.findByFolio(
        'VET-20260606-0001',
        clienteUser,
      );

      expect(result.id).toBe('pago-1');
      expect(result.folioPago).toBe('VET-20260606-0001');
      expect(result.cantidad).toBe(1000);
      expect(result.estado).toBe(EstadoPago.pendiente);
      expect(result.fechaPago).toBeNull();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.cita.id).toBe('cita-1');
      expect(result.cita.estado).toBe(EstadoCita.pendiente);
      expect(result.cita.fecha).toBeInstanceOf(Date);
      expect(result.cita.horaInicio).toBeInstanceOf(Date);
      expect(result.cita.mascota).toEqual({
        id: 'mascota-1',
        nombre: 'Firulais',
      });
      expect(result.cita.servicio).toEqual({
        id: 'servicio-1',
        nombre: 'Consulta general',
      });
      expect(result.cita.sucursal).toEqual({
        id: 'sucursal-1',
        nombre: 'Sucursal Norte',
      });
      expect(result.cita.medico).toEqual({
        id: 'medico-1',
        nombreCompleto: 'Dr. House',
      });
    });

    it('should throw NotFoundException for unauthorized cliente folio', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(
        basePago({
          cita: {
            ...baseCita,
            mascota: {
              id: 'mascota-2',
              nombre: 'Otra',
              propietarioId: 'otro-cliente',
            },
          },
        }),
      );

      await expect(
        service.findByFolio('VET-20260606-0001', clienteUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return payment for authorized medico when estado is not pendiente_de_pago', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(basePago());

      const result = await service.findByFolio('VET-20260606-0001', medicoUser);

      expect(result.folioPago).toBe('VET-20260606-0001');
    });

    it('should throw NotFoundException for medico when estado is pendiente_de_pago', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(
        basePago({
          cita: { ...baseCita, estado: EstadoCita.pendiente_de_pago },
        }),
      );

      await expect(
        service.findByFolio('VET-20260606-0001', medicoUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for medico folio assigned to another vet', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(
        basePago({
          cita: {
            ...baseCita,
            medico: {
              id: 'medico-2',
              usuarioId: 'medico-2',
              usuario: { persona: { nombreCompleto: 'Dr. Otro' } },
            },
          },
        }),
      );

      await expect(
        service.findByFolio('VET-20260606-0001', medicoUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return payment for admin regardless of ownership', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(
        basePago({
          cita: {
            ...baseCita,
            mascota: {
              id: 'mascota-2',
              nombre: 'Otra',
              propietarioId: 'otro-cliente',
            },
          },
        }),
      );

      const result = await service.findByFolio('VET-20260606-0001', adminUser);

      expect(result.folioPago).toBe('VET-20260606-0001');
    });

    it('should throw NotFoundException for non-existent folio', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(null);

      await expect(
        service.findByFolio('VET-19990101-9999', adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for unknown role', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(basePago());

      await expect(
        service.findByFolio('VET-20260606-0001', unknownUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return fallback medico name when persona is missing', async () => {
      mockPrisma.pago.findUnique.mockResolvedValue(
        basePago({
          cita: {
            ...baseCita,
            medico: {
              id: 'medico-1',
              usuarioId: 'medico-1',
              usuario: {
                persona: null,
              } as unknown as PagoWithRelations['cita']['medico']['usuario'],
            },
          },
        }),
      );

      const result = await service.findByFolio(
        'VET-20260606-0001',
        clienteUser,
      );

      expect(result.cita.medico.nombreCompleto).toBe(
        'Veterinario no disponible',
      );
    });
  });
});
