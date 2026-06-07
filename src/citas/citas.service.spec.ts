import { Test, TestingModule } from '@nestjs/testing';
import { CitasService } from './citas.service';
import { PrismaService } from '../prisma/prisma.service';
import { FolioGenerator } from './helpers/folio-generator';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { Rol, EstadoCita } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('CitasService', () => {
  let service: CitasService;
  const mockPrisma = {
    cita: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    mascota: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    medico: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    medicoHorario: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    sucursal: {
      findFirst: jest.fn(),
    },
    consultorio: {
      findFirst: jest.fn(),
    },
    usuario: {
      findUnique: jest.fn(),
    },
    pago: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const mockFolioGenerator = {
    generate: jest.fn(),
  };
  const mockHistorialService = {
    registrarCambio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FolioGenerator, useValue: mockFolioGenerator },
        { provide: CitaEstadoHistorialService, useValue: mockHistorialService },
      ],
    }).compile();

    service = module.get<CitasService>(CitasService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const cliente = { sub: 'user-1', email: 'test@test.com', rol: Rol.cliente };
    // admin user mock available when needed
    const medico = { sub: 'user-3', email: 'med@test.com', rol: Rol.medico };

    const dto = {
      sucursalId: '550e8400-e29b-41d4-a716-446655440000',
      medicoId: '550e8400-e29b-41d4-a716-446655440001',
      mascotaId: '550e8400-e29b-41d4-a716-446655440002',
      servicioId: '550e8400-e29b-41d4-a716-446655440004',
      fecha: '2026-12-31',
      horaInicio: '10:00',
      motivo: 'Consulta general',
    };

    it('debería rechazar si el rol no es cliente ni admin', async () => {
      await expect(service.create(dto, medico)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debería rechazar si la mascota no existe', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue(null);
      await expect(service.create(dto, cliente)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('debería rechazar si la mascota no pertenece al cliente', async () => {
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: 'otro-usuario',
      });
      await expect(service.create(dto, cliente)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('debería rechazar si la cita es en menos de 24 horas', async () => {
      const dtoCorta = {
        ...dto,
        fecha: new Date().toISOString().split('T')[0],
      };
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: cliente.sub,
      });
      await expect(service.create(dtoCorta, cliente)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería rechazar si el médico no tiene horario para este día', async () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 2);
      const dtoValido = {
        ...dto,
        fecha: fechaFutura.toISOString().split('T')[0],
      };

      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: cliente.sub,
      });
      mockPrisma.cita.findMany.mockResolvedValue([]);
      mockPrisma.medicoHorario.findFirst.mockResolvedValue(null);

      await expect(service.create(dtoValido, cliente)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería crear una cita válida derivando consultorio desde horario', async () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 2);
      const dtoValido = {
        ...dto,
        fecha: fechaFutura.toISOString().split('T')[0],
      };

      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: cliente.sub,
      });
      mockPrisma.cita.findFirst.mockResolvedValue(null);
      mockPrisma.cita.findMany.mockResolvedValue([]);
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.medico.findUnique.mockResolvedValue({
        id: dto.medicoId,
        especialidadPrincipal: { precio: 1500.0 },
      });
      mockFolioGenerator.generate.mockResolvedValue('VET-20260606-0001');
      mockPrisma.cita.create.mockResolvedValue({
        id: 'cita-1',
        ...dtoValido,
        estado: EstadoCita.pendiente_de_pago,
      });
      mockPrisma.pago.create.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0001',
        cantidad: 1500.0,
        estado: 'pendiente',
      });

      const result = await service.create(dtoValido, cliente);
      expect(result.estado).toBe(EstadoCita.pendiente_de_pago);
      expect(mockPrisma.cita.create).toHaveBeenCalled();
      // Verify consultorioId was NOT passed in create data (derived from horario)
      const createCall = mockPrisma.cita.create.mock.calls[0] as unknown as [
        {
          data: Record<string, unknown>;
        },
      ];
      expect(createCall[0].data).not.toHaveProperty('consultorioId');
    });

    it('should allow admin booking with emailUsuario', async () => {
      const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 2);
      const dtoAdmin = {
        emailUsuario: 'juan@test.com',
        ...dto,
        fecha: fechaFutura.toISOString().split('T')[0],
      };

      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'user-juan',
        email: 'juan@test.com',
      });
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: 'user-juan',
      });
      mockPrisma.cita.findFirst.mockResolvedValue(null);
      mockPrisma.cita.findMany.mockResolvedValue([]);
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.medico.findUnique.mockResolvedValue({
        id: dto.medicoId,
        especialidadPrincipal: { precio: 1500.0 },
      });
      mockFolioGenerator.generate.mockResolvedValue('VET-20260606-0003');
      mockPrisma.cita.create.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente_de_pago,
      });

      const result = await service.create(dtoAdmin, admin);
      expect(result.estado).toBe(EstadoCita.pendiente_de_pago);
      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: 'juan@test.com' },
      });
    });

    it('should return 404 for unknown emailUsuario', async () => {
      const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 2);
      const dtoAdmin = {
        emailUsuario: 'noexiste@test.com',
        ...dto,
        fecha: fechaFutura.toISOString().split('T')[0],
      };

      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      await expect(service.create(dtoAdmin, admin)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return 403 if pet does not belong to indicated user', async () => {
      const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 2);
      const dtoAdmin = {
        emailUsuario: 'juan@test.com',
        ...dto,
        fecha: fechaFutura.toISOString().split('T')[0],
      };

      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: 'user-juan',
        email: 'juan@test.com',
      });
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: 'otro-usuario',
      });

      await expect(service.create(dtoAdmin, admin)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create Pago with estado pendiente and correct amount', async () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 2);
      const dtoValido = {
        ...dto,
        fecha: fechaFutura.toISOString().split('T')[0],
      };

      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: cliente.sub,
      });
      mockPrisma.cita.findFirst.mockResolvedValue(null);
      mockPrisma.cita.findMany.mockResolvedValue([]);
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.medico.findUnique.mockResolvedValue({
        id: dto.medicoId,
        especialidadPrincipal: { precio: 2000.0 },
      });
      mockFolioGenerator.generate.mockResolvedValue('VET-20260606-0002');
      mockPrisma.cita.create.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente_de_pago,
      });
      mockPrisma.pago.create.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0002',
        cantidad: 2000.0,
        estado: 'pendiente',
      });

      await service.create(dtoValido, cliente);

      expect(mockPrisma.cita.create).toHaveBeenCalled();
      const createCall = mockPrisma.cita.create.mock.calls[0] as unknown as [
        { data: Record<string, unknown> },
      ];
      expect(createCall[0].data.pago).toEqual({
        create: {
          cantidad: 2000.0,
          folioPago: 'VET-20260606-0002',
          estado: 'pendiente',
        },
      });
    });

    it('should write initial audit row on cita creation', async () => {
      const fechaFutura = new Date();
      fechaFutura.setDate(fechaFutura.getDate() + 2);
      const dtoValido = {
        ...dto,
        fecha: fechaFutura.toISOString().split('T')[0],
      };

      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: cliente.sub,
      });
      mockPrisma.cita.findFirst.mockResolvedValue(null);
      mockPrisma.cita.findMany.mockResolvedValue([]);
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.medico.findUnique.mockResolvedValue({
        id: dto.medicoId,
        especialidadPrincipal: { precio: 1500.0 },
      });
      mockFolioGenerator.generate.mockResolvedValue('VET-20260606-0004');
      mockPrisma.cita.create.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente_de_pago,
      });

      await service.create(dtoValido, cliente);

      expect(mockHistorialService.registrarCambio).toHaveBeenCalledWith(
        'cita-1',
        null,
        EstadoCita.pendiente_de_pago,
        cliente.sub,
        null,
      );
    });
  });

  describe('remove', () => {
    const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };

    it('should cancel unpaid cita and mark Pago as cancelada', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente_de_pago,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.cita.update.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.cancelada,
      });

      const result = await service.remove('cita-1', admin);

      expect(result.estado).toBe(EstadoCita.cancelada);
      expect(mockPrisma.pago.update).toHaveBeenCalledWith({
        where: { citaId: 'cita-1' },
        data: { estado: 'cancelada' },
      });
      expect(mockHistorialService.registrarCambio).toHaveBeenCalledWith(
        'cita-1',
        EstadoCita.pendiente_de_pago,
        EstadoCita.cancelada,
        admin.sub,
        null,
      );
    });
  });

  describe('cambiarEstado', () => {
    const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };
    const medicoUser = {
      sub: 'user-med-1',
      email: 'med@test.com',
      rol: Rol.medico,
    };
    const baseCita = {
      id: 'cita-1',
      estado: EstadoCita.pendiente,
      medicoId: 'med-1',
      mascotaId: 'masc-1',
      fecha: new Date(),
      horaInicio: new Date(1970, 0, 1, 14, 0),
    };

    beforeEach(() => {
      jest.useRealTimers();
    });

    it('debería rechazar transición inválida', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.completada,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
        fecha: new Date(),
        horaInicio: new Date(1970, 0, 1, 10, 0),
      });

      await expect(
        service.cambiarEstado(
          'cita-1',
          { estado: EstadoCita.pendiente },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería permitir pendiente → en_curso', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        ...baseCita,
      });
      mockPrisma.cita.update.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
      });

      const result = await service.cambiarEstado(
        'cita-1',
        { estado: EstadoCita.en_curso },
        admin,
      );
      expect(result.estado).toBe(EstadoCita.en_curso);
      expect(mockHistorialService.registrarCambio).toHaveBeenCalledWith(
        'cita-1',
        EstadoCita.pendiente,
        EstadoCita.en_curso,
        admin.sub,
        null,
      );
    });

    it('debería rechazar inasistencia antes de horaInicio', async () => {
      const fechaHoy = new Date();
      const horaFutura = new Date(1970, 0, 1, 23, 59);
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
        fecha: fechaHoy,
        horaInicio: horaFutura,
      });

      await expect(
        service.cambiarEstado(
          'cita-1',
          { estado: EstadoCita.inasistencia },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería rechazar médico no asignado marcando inasistencia', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
        fecha: new Date(),
        horaInicio: new Date(1970, 0, 1, 0, 0),
      });
      mockPrisma.medico.findFirst.mockResolvedValue({
        id: 'med-2',
        usuarioId: medicoUser.sub,
      });

      await expect(
        service.cambiarEstado(
          'cita-1',
          { estado: EstadoCita.inasistencia },
          medicoUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
