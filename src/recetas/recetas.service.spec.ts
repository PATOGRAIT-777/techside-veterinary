/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { RecetasService } from './recetas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitaCompletionService } from '../citas/cita-completion.service';
import { EstadoCita, Rol } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

type MockFn = jest.Mock;

interface MockPrisma {
  cita: { findUnique: MockFn; update: MockFn };
  receta: { create: MockFn; findMany: MockFn; findUnique: MockFn };
  medico: { findFirst: MockFn };
  mascota: { findMany: MockFn; findUnique: MockFn };
  $transaction: MockFn;
}

const enrichedMascota = {
  id: 'masc-1',
  nombre: 'Fido',
  propietarioId: 'usr-1',
  raza: { id: 'raz-1', nombre: 'Golden' },
  color: { id: 'col-1', nombre: 'Dorado' },
  tipoPelo: { id: 'tp-1', nombre: 'Largo' },
  patronPelo: { id: 'pp-1', nombre: 'Sólido' },
  comportamiento: { id: 'comp-1', nombre: 'Amigable' },
  fotoPerfil: { id: 'foto-1', url: '/fido.jpg' },
  carnetVacunacion: { id: 'carnet-1', url: '/carnet.pdf' },
  alergias: [],
};

const enrichedMedico = {
  id: 'med-1',
  usuario: { persona: { id: 'per-1', nombreCompleto: 'Dra. Ana López' } },
  especialidadPrincipal: { id: 'esp-1', nombre: 'Cirugía' },
};

const enrichedSucursal = {
  id: 'suc-1',
  nombre: 'Sucursal Centro',
};

const enrichedCita = {
  id: 'cita-1',
  fecha: new Date('2026-12-31T00:00:00.000Z'),
  horaInicio: new Date(1970, 0, 1, 10, 0),
  horaFin: new Date(1970, 0, 1, 11, 0),
  mascota: enrichedMascota,
  medico: enrichedMedico,
  sucursal: enrichedSucursal,
};

const enrichedReceta = {
  id: 'rec-1',
  citaId: 'cita-1',
  diagnostico: 'Diagnóstico de prueba',
  observaciones: null,
  fechaReceta: new Date(),
  detalles: [
    {
      id: 'det-1',
      medicamento: 'Amoxicilina',
      dosis: '500mg',
      frecuencia: 'Cada 8 horas',
      duracion: '7 días',
      viaAdministracion: 'Oral',
      instrucciones: null,
    },
  ],
  cita: enrichedCita,
};

describe('RecetasService', () => {
  let service: RecetasService;

  const mockPrisma: MockPrisma = {
    cita: { findUnique: jest.fn(), update: jest.fn() },
    receta: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    medico: { findFirst: jest.fn() },
    mascota: { findMany: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn((callback: (tx: MockPrisma) => unknown) =>
      callback(mockPrisma),
    ),
  };

  const mockCompletion = { checkAndComplete: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecetasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CitaCompletionService, useValue: mockCompletion },
      ],
    }).compile();

    service = module.get<RecetasService>(RecetasService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
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

    it('debería crear receta y devolver forma enriquecida', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.receta.findUnique.mockResolvedValue(null);
      mockPrisma.receta.create.mockResolvedValue(enrichedReceta);

      const result = await service.create(dto, admin);

      expect(result.diagnostico).toBe(dto.diagnostico);
      expect((result as any).cita.mascota.raza.nombre).toBe('Golden');
      expect((result as any).cita.mascota).not.toHaveProperty('propietarioId');
      expect((result as any).cita.medico.nombreCompleto).toBe('Dra. Ana López');
      expect((result as any).cita.medico.especialidad).toBe('Cirugía');
      expect((result as any).cita.sucursal.nombre).toBe('Sucursal Centro');
      expect(mockCompletion.checkAndComplete).toHaveBeenCalledWith('cita-1');
    });
  });

  describe('findAll', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    it('debería devolver recetas enriquecidas para admin', async () => {
      mockPrisma.receta.findMany.mockResolvedValue([enrichedReceta]);

      const result = await service.findAll(admin);

      expect(result).toHaveLength(1);
      expect((result[0] as any).cita.mascota.raza.nombre).toBe('Golden');
      expect((result[0] as any).cita.mascota).not.toHaveProperty(
        'propietarioId',
      );
      expect((result[0] as any).cita.medico.nombreCompleto).toBe(
        'Dra. Ana López',
      );
      expect((result[0] as any).cita.sucursal.nombre).toBe('Sucursal Centro');
    });
  });

  describe('findOne', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    it('debería devolver receta enriquecida', async () => {
      mockPrisma.receta.findUnique.mockResolvedValue(enrichedReceta);

      const result = await service.findOne('rec-1', admin);

      expect((result as any).cita.mascota.raza.nombre).toBe('Golden');
      expect((result as any).cita.medico.nombreCompleto).toBe('Dra. Ana López');
      expect((result as any).cita.sucursal.nombre).toBe('Sucursal Centro');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockPrisma.receta.findUnique.mockResolvedValue(null);

      await expect(service.findOne('rec-1', admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCita', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    it('debería devolver receta enriquecida por citaId', async () => {
      mockPrisma.receta.findUnique.mockResolvedValue(enrichedReceta);

      const result = await service.findByCita('cita-1', admin);

      expect((result as any).cita.mascota.raza.nombre).toBe('Golden');
      expect((result as any).cita.medico.nombreCompleto).toBe('Dra. Ana López');
      expect((result as any).cita.sucursal.nombre).toBe('Sucursal Centro');
    });

    it('debería lanzar NotFoundException si no existe', async () => {
      mockPrisma.receta.findUnique.mockResolvedValue(null);

      await expect(service.findByCita('cita-1', admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
