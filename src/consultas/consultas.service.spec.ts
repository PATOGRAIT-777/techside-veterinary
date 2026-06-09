import { Test, TestingModule } from '@nestjs/testing';
import { ConsultasService } from './consultas.service';
import { PrismaService } from '../prisma/prisma.service';
import { CitaCompletionService } from '../citas/cita-completion.service';
import { EstadoCita, Rol } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ConsultasService', () => {
  let service: ConsultasService;

  const mockPrisma = {
    cita: { findUnique: jest.fn(), findMany: jest.fn() },
    consulta: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    medico: { findFirst: jest.fn() },
    mascota: { findUnique: jest.fn(), findMany: jest.fn() },
  };

  const mockCompletion = { checkAndComplete: jest.fn() };

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
    estado: EstadoCita.en_curso,
    mascota: enrichedMascota,
    medico: enrichedMedico,
    sucursal: enrichedSucursal,
  };

  const enrichedConsulta = {
    id: 'cons-1',
    peso: 5.5,
    temperatura: 38.5,
    frecuenciaCardiaca: 120,
    frecuenciaRespiratoria: 30,
    presionArterial: '120/80',
    estadoGeneral: 'Bueno',
    notasEvolucion: 'Evolución favorable',
    cita: enrichedCita,
  };

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
      mockPrisma.consulta.create.mockResolvedValue(enrichedConsulta);

      const result = await service.create(dto, admin);

      expect(result.peso).toBe('5.5');
      expect(result.temperatura).toBe('38.5');
      expect(result.cita.mascota.raza!.nombre).toBe('Golden');
      expect(result.cita.mascota).not.toHaveProperty('propietarioId');
      expect(result.cita.medico.nombreCompleto).toBe('Dra. Ana López');
      expect(result.cita.sucursal.nombre).toBe('Sucursal Centro');
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

  describe('findAll', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    it('should return enriched consultas for admin', async () => {
      mockPrisma.consulta.findMany.mockResolvedValue([enrichedConsulta]);

      const result = await service.findAll(admin);

      expect(result).toHaveLength(1);
      expect(result[0].peso).toBe('5.5');
      expect(result[0].cita.mascota.raza!.nombre).toBe('Golden');
      expect(result[0].cita.mascota).not.toHaveProperty('propietarioId');
      expect(result[0].cita.medico.nombreCompleto).toBe('Dra. Ana López');
      expect(result[0].cita.sucursal.nombre).toBe('Sucursal Centro');
    });

    it('should return empty array for medico without consultas', async () => {
      const medicoUser = {
        sub: 'user-med-1',
        email: 'med@test.com',
        rol: Rol.medico,
      };
      mockPrisma.medico.findFirst.mockResolvedValue(null);

      const result = await service.findAll(medicoUser);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    it('should return enriched consulta', async () => {
      mockPrisma.consulta.findUnique.mockResolvedValue(enrichedConsulta);

      const result = await service.findOne('cons-1', admin);

      expect(result.peso).toBe('5.5');
      expect(result.temperatura).toBe('38.5');
      expect(result.cita.mascota.raza!.nombre).toBe('Golden');
      expect(result.cita.medico.nombreCompleto).toBe('Dra. Ana López');
      expect(result.cita.sucursal.nombre).toBe('Sucursal Centro');
    });

    it('should throw NotFoundException for missing consulta', async () => {
      mockPrisma.consulta.findUnique.mockResolvedValue(null);

      await expect(service.findOne('cons-1', admin)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByCita', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    it('should return enriched consulta by citaId', async () => {
      mockPrisma.consulta.findUnique.mockResolvedValue(enrichedConsulta);

      const result = await service.findByCita('cita-1', admin);

      expect(result.peso).toBe('5.5');
      expect(result.cita.mascota.raza!.nombre).toBe('Golden');
      expect(result.cita.medico.nombreCompleto).toBe('Dra. Ana López');
      expect(result.cita.sucursal.nombre).toBe('Sucursal Centro');
    });
  });

  describe('update', () => {
    const admin = { sub: 'u2', email: 'admin@test.com', rol: Rol.admin };

    it('should update and return enriched consulta', async () => {
      mockPrisma.consulta.findUnique
        .mockResolvedValueOnce({
          ...enrichedConsulta,
          cita: { ...enrichedCita, mascotaId: 'masc-1', medicoId: 'med-1' },
        })
        .mockResolvedValueOnce(enrichedConsulta);
      mockPrisma.consulta.update.mockResolvedValue({
        ...enrichedConsulta,
        peso: 6.0,
        notasEvolucion: 'Actualizado',
      });

      const result = await service.update(
        'cons-1',
        { peso: 6.0, notasEvolucion: 'Actualizado' },
        admin,
      );

      expect(result.peso).toBe('6');
      expect(result.notasEvolucion).toBe('Actualizado');
      expect(result.cita.mascota.raza!.nombre).toBe('Golden');
      expect(result.cita.medico.nombreCompleto).toBe('Dra. Ana López');
    });
  });
});
