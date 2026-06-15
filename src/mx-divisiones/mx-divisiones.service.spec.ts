import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MxDivisionesService } from './mx-divisiones.service';
import { PrismaService } from '../prisma/prisma.service';
import { MxDivision } from '@prisma/client';

describe('MxDivisionesService', () => {
  let service: MxDivisionesService;

  const mockPrismaService = {
    mxDivision: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    sucursal: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MxDivisionesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MxDivisionesService>(MxDivisionesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return only active divisions', async () => {
      const divisions: MxDivision[] = [
        {
          id: '00000000-0000-4000-8000-000000000001',
          nombre: 'Centro',
          clave: 'VTC-001',
          direccion: null,
          telefono: null,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.mxDivision.findMany.mockResolvedValue(divisions);

      const result = await service.findAll();
      expect(result).toEqual(divisions);
      expect(mockPrismaService.mxDivision.findMany).toHaveBeenCalledWith({
        where: { activo: true },
      });
    });
  });

  describe('findById', () => {
    it('should return an active division by id', async () => {
      const division: MxDivision = {
        id: '00000000-0000-4000-8000-000000000001',
        nombre: 'Centro',
        clave: 'VTC-001',
        direccion: null,
        telefono: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.mxDivision.findFirst.mockResolvedValue(division);

      const result = await service.findById(
        '00000000-0000-4000-8000-000000000001',
      );
      expect(result).toEqual(division);
      expect(mockPrismaService.mxDivision.findFirst).toHaveBeenCalledWith({
        where: { id: '00000000-0000-4000-8000-000000000001', activo: true },
      });
    });

    it('should throw NotFoundException for inactive or non-existent id', async () => {
      mockPrismaService.mxDivision.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('00000000-0000-4000-8000-0000000003e7'),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.mxDivision.findFirst).toHaveBeenCalledWith({
        where: { id: '00000000-0000-4000-8000-0000000003e7', activo: true },
      });
    });
  });

  describe('findSucursales', () => {
    it('should return only active sucursales with id and nombre', async () => {
      const sucursales = [
        {
          id: '00000000-0000-4000-8000-000000000003',
          nombre: 'Vetec Centro',
        },
      ];
      mockPrismaService.sucursal.findMany.mockResolvedValue(sucursales);

      const result = await service.findSucursales();
      expect(result).toEqual(sucursales);
      expect(mockPrismaService.sucursal.findMany).toHaveBeenCalledWith({
        where: { activo: true },
        select: { id: true, nombre: true },
        orderBy: { nombre: 'asc' },
      });
    });
  });
});
