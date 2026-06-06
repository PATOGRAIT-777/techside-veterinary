import { Test, TestingModule } from '@nestjs/testing';
import { MedicosService } from './medicos.service';
import { PrismaService } from '../prisma/prisma.service';
import { Rol, EstadoAsistencia } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('MedicosService', () => {
  let service: MedicosService;

  const mockPrisma = {
    medico: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    consultorio: {
      findUnique: jest.fn(),
    },
    medicoHorario: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    medicoAsistencia: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicosService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MedicosService>(MedicosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('debería rechazar si el usuario no tiene rol médico', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        rol: Rol.cliente,
      });
      await expect(service.create({ usuarioId: 'u1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería rechazar si el usuario ya tiene perfil de médico', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        rol: Rol.medico,
      });
      mockPrisma.medico.findFirst.mockResolvedValue({
        id: 'm1',
        usuarioId: 'u1',
      });
      await expect(service.create({ usuarioId: 'u1' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('debería crear un médico válido', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        rol: Rol.medico,
      });
      mockPrisma.medico.findFirst.mockResolvedValue(null);
      mockPrisma.medico.create.mockResolvedValue({ id: 'm1', usuarioId: 'u1' });

      const result = await service.create({ usuarioId: 'u1' });
      expect(result.id).toBe('m1');
    });
  });

  describe('crearHorario', () => {
    it('debería rechazar franja horaria inválida entre semana', async () => {
      mockPrisma.medico.findUnique.mockResolvedValue({ id: 'm1' });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);

      await expect(
        service.crearHorario('m1', {
          diaSemana: 'lunes',
          horaInicio: '06:00',
          horaFin: '13:00',
          consultorioId: 'c1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería crear horario válido entre semana', async () => {
      mockPrisma.medico.findUnique.mockResolvedValue({ id: 'm1' });
      mockPrisma.consultorio.findUnique.mockResolvedValue({ id: 'c1' });
      mockPrisma.medicoHorario.findFirst.mockResolvedValue(null);
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.medicoHorario.create.mockResolvedValue({
        id: 'h1',
        medicoId: 'm1',
        diaSemana: 'lunes',
      });

      const result = await service.crearHorario('m1', {
        diaSemana: 'lunes',
        horaInicio: '09:00',
        horaFin: '14:00',
        consultorioId: 'c1',
      });
      expect(result.id).toBe('h1');
    });
  });

  describe('registrarEntradaAutomatica', () => {
    it('debería no crear si ya existe asistencia', async () => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      mockPrisma.medicoAsistencia.findUnique.mockResolvedValue({
        id: 'a1',
        medicoId: 'm1',
        fecha: hoy,
      });

      const result = await service.registrarEntradaAutomatica('m1');
      expect(result!.id).toBe('a1');
      expect(mockPrisma.medicoAsistencia.create).not.toHaveBeenCalled();
    });

    it('debería no crear si no es día laboral', async () => {
      mockPrisma.medicoAsistencia.findUnique.mockResolvedValue(null);
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);

      const result = await service.registrarEntradaAutomatica('m1');
      expect(result).toBeNull();
      expect(mockPrisma.medicoAsistencia.create).not.toHaveBeenCalled();
    });

    it('debería crear asistencia automática', async () => {
      mockPrisma.medicoAsistencia.findUnique.mockResolvedValue(null);
      mockPrisma.medicoHorario.findMany.mockResolvedValue([
        {
          id: 'h1',
          diaSemana: 'lunes',
          horaInicio: new Date(),
          horaFin: new Date(),
        },
      ]);
      mockPrisma.medicoAsistencia.create.mockResolvedValue({
        id: 'a1',
        medicoId: 'm1',
        estado: EstadoAsistencia.asistencia,
      });

      const result = await service.registrarEntradaAutomatica('m1');
      expect(result!.estado).toBe(EstadoAsistencia.asistencia);
      expect(mockPrisma.medicoAsistencia.create).toHaveBeenCalled();
    });
  });
});
