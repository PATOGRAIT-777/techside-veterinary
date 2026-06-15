import { Test, TestingModule } from '@nestjs/testing';
import { MxDivisionesController } from './mx-divisiones.controller';
import { MxDivisionesService } from './mx-divisiones.service';
import { MxDivision } from '@prisma/client';

describe('MxDivisionesController', () => {
  let controller: MxDivisionesController;

  const mockService = {
    findAll: jest.fn(),
    findById: jest.fn(),
    findSucursales: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MxDivisionesController],
      providers: [{ provide: MxDivisionesService, useValue: mockService }],
    }).compile();

    controller = module.get<MxDivisionesController>(MxDivisionesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should delegate to service.findAll', async () => {
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
      mockService.findAll.mockResolvedValue(divisions);

      const result = await controller.findAll();
      expect(result).toEqual(divisions);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findSucursales', () => {
    it('should delegate to service.findSucursales', async () => {
      const sucursales = [
        {
          id: '00000000-0000-4000-8000-000000000003',
          nombre: 'Vetec Centro',
        },
      ];
      mockService.findSucursales.mockResolvedValue(sucursales);

      const result = await controller.findSucursales();
      expect(result).toEqual(sucursales);
      expect(mockService.findSucursales).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should delegate to service.findById with parsed id', async () => {
      const division: MxDivision = {
        id: '00000000-0000-4000-8000-000000000002',
        nombre: 'Norte',
        clave: 'VTN-002',
        direccion: null,
        telefono: null,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockService.findById.mockResolvedValue(division);

      const result = await controller.findById(
        '00000000-0000-4000-8000-000000000002',
      );
      expect(result).toEqual(division);
      expect(mockService.findById).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000002',
      );
    });
  });
});
