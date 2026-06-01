import { Test, TestingModule } from '@nestjs/testing';
import { PersonasService } from './personas.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

describe('PersonasService', () => {
  let service: PersonasService;

  const mockPrismaService = {
    persona: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonasService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PersonasService>(PersonasService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a persona', async () => {
      const createInput: Prisma.PersonaCreateInput = {
        nombreCompleto: 'Juan Pérez',
        telefono: '5215512345678',
        calle: 'Av. Principal 100',
        sucursal: { connect: { id: 1 } },
      };

      const mockPersona = {
        id: 1,
        ...createInput,
        telefonoSecundario: null,
        numExterior: null,
        numInterior: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.persona.create.mockResolvedValue(mockPersona);

      const result = await service.create(createInput);

      expect(mockPrismaService.persona.create).toHaveBeenCalledWith({
        data: createInput,
      });
      expect(result).toEqual(mockPersona);
    });
  });
});
