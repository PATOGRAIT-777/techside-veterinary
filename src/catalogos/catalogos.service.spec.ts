import { Test, TestingModule } from '@nestjs/testing';
import { CatalogosService } from './catalogos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CatalogosService', () => {
  let service: CatalogosService;

  const mockPrismaService = {
    especie: {
      findMany: jest.fn(),
    },
    raza: {
      findMany: jest.fn(),
    },
    color: {
      findMany: jest.fn(),
    },
    tipoPelo: {
      findMany: jest.fn(),
    },
    patronPelo: {
      findMany: jest.fn(),
    },
    comportamiento: {
      findMany: jest.fn(),
    },
    catalogoAlergia: {
      findMany: jest.fn(),
    },
    servicio: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogosService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CatalogosService>(CatalogosService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllEspecies', () => {
    it('should return species ordered by nombre', async () => {
      const species = [
        {
          id: 'uuid-1',
          nombre: 'Ave',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'uuid-2',
          nombre: 'Canino',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.especie.findMany.mockResolvedValue(species);

      const result = await service.findAllEspecies();
      expect(result).toEqual(species);
      expect(mockPrismaService.especie.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findAllRazas', () => {
    it('should return all breeds ordered by nombre when no especieId is provided', async () => {
      const breeds = [
        {
          id: 'uuid-1',
          nombre: 'Labrador',
          especieId: 'uuid-e1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.raza.findMany.mockResolvedValue(breeds);

      const result = await service.findAllRazas();
      expect(result).toEqual(breeds);
      expect(mockPrismaService.raza.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });

    it('should filter breeds by especieId when provided', async () => {
      const breeds = [
        {
          id: 'uuid-1',
          nombre: 'Siamés',
          especieId: 'uuid-f1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.raza.findMany.mockResolvedValue(breeds);

      const result = await service.findAllRazas('uuid-f1');
      expect(result).toEqual(breeds);
      expect(mockPrismaService.raza.findMany).toHaveBeenCalledWith({
        where: { especieId: 'uuid-f1' },
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findAllColores', () => {
    it('should return colors ordered by nombre', async () => {
      const colors = [
        {
          id: 'uuid-1',
          nombre: 'Negro',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.color.findMany.mockResolvedValue(colors);

      const result = await service.findAllColores();
      expect(result).toEqual(colors);
      expect(mockPrismaService.color.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findAllTiposPelo', () => {
    it('should return hair types ordered by nombre', async () => {
      const types = [
        {
          id: 'uuid-1',
          nombre: 'Corto',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.tipoPelo.findMany.mockResolvedValue(types);

      const result = await service.findAllTiposPelo();
      expect(result).toEqual(types);
      expect(mockPrismaService.tipoPelo.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findAllPatronesPelo', () => {
    it('should return hair patterns ordered by nombre', async () => {
      const patterns = [
        {
          id: 'uuid-1',
          nombre: 'Sólido',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.patronPelo.findMany.mockResolvedValue(patterns);

      const result = await service.findAllPatronesPelo();
      expect(result).toEqual(patterns);
      expect(mockPrismaService.patronPelo.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findAllComportamientos', () => {
    it('should return behaviors ordered by nombre', async () => {
      const behaviors = [
        {
          id: 'uuid-1',
          nombre: 'Tranquilo',
          requiereBozal: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.comportamiento.findMany.mockResolvedValue(behaviors);

      const result = await service.findAllComportamientos();
      expect(result).toEqual(behaviors);
      expect(mockPrismaService.comportamiento.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findAllAlergias', () => {
    it('should return allergies ordered by nombre', async () => {
      const allergies = [
        {
          id: 'uuid-1',
          nombre: 'Polen',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.catalogoAlergia.findMany.mockResolvedValue(allergies);

      const result = await service.findAllAlergias();
      expect(result).toEqual(allergies);
      expect(mockPrismaService.catalogoAlergia.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
      });
    });
  });

  describe('findServicios', () => {
    it('should return services ordered by nombre with selected fields', async () => {
      const services = [
        { id: 'uuid-1', nombre: 'Consulta general', precioBase: '350.00' },
        { id: 'uuid-2', nombre: 'Vacunación', precioBase: '150.00' },
      ];
      mockPrismaService.servicio.findMany.mockResolvedValue(services);

      const result = await service.findServicios();
      expect(result).toEqual(services);
      expect(mockPrismaService.servicio.findMany).toHaveBeenCalledWith({
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, precioBase: true },
      });
    });
  });
});
