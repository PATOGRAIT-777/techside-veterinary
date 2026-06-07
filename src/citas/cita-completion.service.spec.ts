import { Test, TestingModule } from '@nestjs/testing';
import { CitaCompletionService } from './cita-completion.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { EstadoCita } from '@prisma/client';

describe('CitaCompletionService', () => {
  let service: CitaCompletionService;

  const mockPrisma = {
    cita: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockHistorialService = {
    registrarCambio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitaCompletionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CitaEstadoHistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<CitaCompletionService>(CitaCompletionService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAndComplete', () => {
    it('should do nothing if cita is not en_curso', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.pendiente,
        consulta: { id: 'cons-1' },
        receta: { id: 'rec-1' },
      });

      await service.checkAndComplete('c1');

      expect(mockPrisma.cita.update).not.toHaveBeenCalled();
    });

    it('should do nothing if only consulta exists', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.en_curso,
        consulta: { id: 'cons-1' },
        receta: null,
      });

      await service.checkAndComplete('c1');

      expect(mockPrisma.cita.update).not.toHaveBeenCalled();
    });

    it('should do nothing if only receta exists', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.en_curso,
        consulta: null,
        receta: { id: 'rec-1' },
      });

      await service.checkAndComplete('c1');

      expect(mockPrisma.cita.update).not.toHaveBeenCalled();
    });

    it('should complete cita when both consulta and receta exist', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.en_curso,
        consulta: { id: 'cons-1' },
        receta: { id: 'rec-1' },
      });
      mockPrisma.cita.update.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.completada,
      });

      await service.checkAndComplete('c1');

      expect(mockPrisma.cita.update).toHaveBeenCalledWith({
        where: { id: 'c1', estado: EstadoCita.en_curso },
        data: { estado: EstadoCita.completada },
      });
      expect(mockHistorialService.registrarCambio).toHaveBeenCalledWith(
        'c1',
        EstadoCita.en_curso,
        EstadoCita.completada,
        null,
        'Consulta y receta registradas',
      );
    });

    it('should be idempotent (no-op if already completada)', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'c1',
        estado: EstadoCita.completada,
        consulta: { id: 'cons-1' },
        receta: { id: 'rec-1' },
      });

      await service.checkAndComplete('c1');

      expect(mockPrisma.cita.update).not.toHaveBeenCalled();
    });
  });
});
