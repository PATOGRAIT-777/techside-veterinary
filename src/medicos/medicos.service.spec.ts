import { Test, TestingModule } from '@nestjs/testing';
import { MedicosService } from './medicos.service';
import { PrismaService } from '../prisma/prisma.service';
import { Rol, EstadoAsistencia } from '@prisma/client';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AvailabilityCalculator } from '../citas/helpers/availability-calculator';

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
        AvailabilityCalculator,
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

  describe('findFiltered', () => {
    it('should return doctors filtered by specialty with branch priority', async () => {
      const mockMedicos = [
        {
          id: 'med-2',
          especialidadPrincipalId: 'esp-1',
          sucursalId: 'suc-2',
          nombre: 'Dr. B',
        },
        {
          id: 'med-1',
          especialidadPrincipalId: 'esp-1',
          sucursalId: 'suc-1',
          nombre: 'Dr. A',
        },
      ];
      mockPrisma.medico.findMany.mockResolvedValue(mockMedicos);

      const result = await service.findFiltered({
        especialidadId: 'esp-1',
        sucursalId: 'suc-1',
      });

      expect(result[0].id).toBe('med-1'); // sucursal match first
      expect(result[1].id).toBe('med-2');
      expect(mockPrisma.medico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { especialidadPrincipalId: 'esp-1' },
        }),
      );
    });

    it('should return all doctors when no filters provided', async () => {
      const mockMedicos = [
        { id: 'med-1', nombre: 'Dr. A' },
        { id: 'med-2', nombre: 'Dr. B' },
      ];
      mockPrisma.medico.findMany.mockResolvedValue(mockMedicos);

      const result = await service.findFiltered({});

      expect(result).toHaveLength(2);
      expect(mockPrisma.medico.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('disponibilidadDias', () => {
    it('should validate date range and delegate to calculator', async () => {
      const calculatorSpy = jest
        .spyOn(service['availability'], 'computeDays')
        .mockResolvedValue([{ fecha: '2026-06-08', disponible: true }]);

      const result = await service.disponibilidadDias(
        'med-1',
        '2026-06-08',
        '2026-06-08',
      );

      expect(result).toEqual([{ fecha: '2026-06-08', disponible: true }]);
      expect(calculatorSpy).toHaveBeenCalledWith(
        'med-1',
        new Date('2026-06-08'),
        new Date('2026-06-08'),
      );
    });

    it('should reject range exceeding 60 days', async () => {
      await expect(
        service.disponibilidadDias('med-1', '2026-06-01', '2026-08-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject hasta beyond 2 months', async () => {
      const desde = new Date();
      desde.setDate(desde.getDate() + 1);
      const hasta = new Date();
      hasta.setMonth(hasta.getMonth() + 3);
      const desdeStr = desde.toISOString().split('T')[0];
      const hastaStr = hasta.toISOString().split('T')[0];

      await expect(
        service.disponibilidadDias('med-1', desdeStr, hastaStr),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('disponibilidadSlots', () => {
    it('should delegate to calculator', async () => {
      const calculatorSpy = jest
        .spyOn(service['availability'], 'computeSlots')
        .mockResolvedValue({
          slots: [{ horaInicio: '09:00', horaFin: '10:00', disponible: true }],
        });

      const result = await service.disponibilidadSlots('med-1', '2026-06-08');

      expect(result.slots).toHaveLength(1);
      expect(calculatorSpy).toHaveBeenCalledWith(
        'med-1',
        new Date('2026-06-08'),
      );
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
