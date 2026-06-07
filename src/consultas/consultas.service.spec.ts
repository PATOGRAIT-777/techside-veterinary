import { Test, TestingModule } from '@nestjs/testing';
import { ConsultasService } from './consultas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitaCompletionService } from '../citas/cita-completion.service';
import { EstadoCita, Rol } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('ConsultasService', () => {
  let service: ConsultasService;

  const mockPrisma = {
    cita: { findUnique: jest.fn() },
    consulta: { create: jest.fn(), findUnique: jest.fn() },
    medico: { findFirst: jest.fn() },
    mascota: { findUnique: jest.fn() },
  };

  const mockCompletion = { checkAndComplete: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CitaCompletionService, useValue: mockCompletion },
      ],
    }).compile();

    service = module.get<ConsultasService>(ConsultasService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    const dto = {
      citaId: 'cita-1',
      peso: 5.5,
      temperatura: 38.5,
      frecuenciaCardiaca: 120,
      frecuenciaRespiratoria: 30,
      presionArterial: '120/80',
      estadoGeneral: 'Bueno',
      notasEvolucion: 'Evolución favorable',
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

    it('debería crear consulta y llamar checkAndComplete', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.consulta.findUnique.mockResolvedValue(null);
      mockPrisma.consulta.create.mockResolvedValue({
        id: 'cons-1',
        citaId: 'cita-1',
        peso: dto.peso,
      });

      const result = await service.create(dto, admin);
      expect(result.peso).toBe(dto.peso);
      expect(mockCompletion.checkAndComplete).toHaveBeenCalledWith('cita-1');
    });

    it('debería rechazar si ya existe consulta para la cita', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.consulta.findUnique.mockResolvedValue({ id: 'cons-1' });

      await expect(service.create(dto, admin)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
