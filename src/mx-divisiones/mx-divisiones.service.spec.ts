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
          id: 1,
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
        id: 1,
        nombre: 'Centro',
        clave: 'VTC-001',
        direccion: null,
        telefono: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.mxDivision.findFirst.mockResolvedValue(division);

      const result = await service.findById(1);
      expect(result).toEqual(division);
      expect(mockPrismaService.mxDivision.findFirst).toHaveBeenCalledWith({
        where: { id: 1, activo: true },
      });
    });

    it('should throw NotFoundException for inactive or non-existent id', async () => {
      mockPrismaService.mxDivision.findFirst.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.mxDivision.findFirst).toHaveBeenCalledWith({
        where: { id: 999, activo: true },
      });
    });
  });
});
