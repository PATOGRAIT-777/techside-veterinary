import { Test, TestingModule } from '@nestjs/testing';
import { RecetasService } from './recetas.service';
import { PrismaService } from '../prisma/prisma.service';
import { Rol, EstadoCita } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('RecetasService', () => {
  let service: RecetasService;

  const mockPrisma = {
    cita: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    receta: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    medico: {
      findFirst: jest.fn(),
    },
    mascota: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecetasService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RecetasService>(RecetasService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const medicoUser = { sub: 'u1', email: 'med@test.com', rol: Rol.medico };
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    const dto = {
      citaId: 'cita-1',
      diagnostico: 'Diagnóstico de prueba',
      detalles: [
        {
          medicamento: 'Amoxicilina',
          dosis: '500mg',
          frecuencia: 'Cada 8 horas',
          duracion: '7 días',
          viaAdministracion: 'Oral',
        },
      ],
    };

    it('debería rechazar si la cita no está en curso', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });

      await expect(service.create(dto, admin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debería crear receta y completar cita', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.receta.findUnique.mockResolvedValue(null);
      mockPrisma.receta.create.mockResolvedValue({
        id: 'rec-1',
        citaId: 'cita-1',
        diagnostico: dto.diagnostico,
      });
      mockPrisma.cita.update.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.completada,
      });

      const result = await service.create(dto, admin);
      expect(result.diagnostico).toBe(dto.diagnostico);
      expect(mockPrisma.cita.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { estado: EstadoCita.completada },
        }),
      );
    });
  });
});
