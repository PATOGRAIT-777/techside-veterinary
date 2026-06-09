/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { CitasService } from './citas.service';
import { PrismaService } from '../prisma/prisma.service';
import { FolioGenerator } from './helpers/folio-generator';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { EmailService } from '../email/email.service';
import { Rol, EstadoCita } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
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
      findUnique: jest.fn(),
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
  const mockEmailService = {
    send: jest.fn(),
  };

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

  const enrichedServicio = {
    id: 'srv-1',
    nombre: 'Consulta general',
  };

  const enrichedPago = {
    id: 'pago-1',
    folioPago: 'VET-20260606-0001',
    cantidad: 1500.0,
    estado: 'pendiente',
    fechaPago: null,
  };

  const enrichedCita = {
    id: 'cita-1',
    fecha: new Date('2026-12-31T00:00:00.000Z'),
    horaInicio: new Date(1970, 0, 1, 10, 0),
    horaFin: new Date(1970, 0, 1, 11, 0),
    estado: EstadoCita.pendiente_de_pago,
    motivo: 'Consulta general',
    sucursal: enrichedSucursal,
    medico: enrichedMedico,
    mascota: enrichedMascota,
    servicio: enrichedServicio,
    pago: enrichedPago,
    receta: null,
    consulta: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: FolioGenerator, useValue: mockFolioGenerator },
        { provide: CitaEstadoHistorialService, useValue: mockHistorialService },
        { provide: EmailService, useValue: mockEmailService },
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
      const now = new Date('2026-06-10T15:00:00');
      jest.useFakeTimers().setSystemTime(now);

      const dtoCorta = {
        ...dto,
        fecha: '2026-06-11',
        horaInicio: '08:00',
      };
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: cliente.sub,
      });
      await expect(service.create(dtoCorta, cliente)).rejects.toThrow(
        BadRequestException,
      );

      jest.useRealTimers();
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
      mockPrisma.cita.create.mockResolvedValue(enrichedCita);
      mockPrisma.pago.create.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0001',
        cantidad: 1500.0,
        estado: 'pendiente',
      });
      mockPrisma.usuario.findUnique.mockResolvedValue({
        id: cliente.sub,
        email: cliente.email,
      });
      mockPrisma.consultorio.findUnique.mockResolvedValue({
        id: 'cons-1',
        nombre: 'Consultorio A',
      });

      const result = await service.create(dtoValido, cliente);
      expect(result.estado).toBe(EstadoCita.pendiente_de_pago);
      expect((result as any).mascota.raza).toEqual({
        id: 'raz-1',
        nombre: 'Golden',
      });
      expect((result as any).mascota).not.toHaveProperty('propietarioId');
      expect((result as any).mascota).not.toHaveProperty('observaciones');
      expect((result as any).medico).toEqual({
        id: 'med-1',
        nombreCompleto: 'Dra. Ana López',
        especialidad: 'Cirugía',
      });
      expect((result as any).sucursal).toEqual({
        id: 'suc-1',
        nombre: 'Sucursal Centro',
      });
      expect((result as any).pago).toEqual({
        id: 'pago-1',
        folioPago: 'VET-20260606-0001',
        cantidad: '1500',
        estado: 'pendiente',
        fechaPago: null,
      });
      expect(mockPrisma.cita.create).toHaveBeenCalled();
      // Verify consultorioId was NOT passed in create data (derived from horario)
      const createCall = mockPrisma.cita.create.mock.calls[0] as unknown as [
        {
          data: Record<string, unknown>;
        },
      ];
      expect(createCall[0].data).not.toHaveProperty('consultorioId');
      expect(mockEmailService.send).toHaveBeenCalledWith(
        cliente.email,
        'Confirmación de cita',
        expect.stringContaining('VET-20260606-0001'),
      );
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
      mockPrisma.cita.create.mockResolvedValue(enrichedCita);
      mockPrisma.consultorio.findUnique.mockResolvedValue({
        id: 'cons-1',
        nombre: 'Consultorio A',
      });

      const result = await service.create(dtoAdmin, admin);
      expect(result.estado).toBe(EstadoCita.pendiente_de_pago);
      expect((result as any).mascota.raza).toEqual({
        id: 'raz-1',
        nombre: 'Golden',
      });
      expect((result as any).medico.nombreCompleto).toBe('Dra. Ana López');
      expect((result as any).sucursal.nombre).toBe('Sucursal Centro');
      expect((result as any).pago).toBeDefined();
      expect((result as any).pago.cantidad).toBe('1500');
      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: 'juan@test.com' },
      });
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'juan@test.com',
        'Confirmación de cita',
        expect.stringContaining('VET-20260606-0003'),
      );
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
      mockPrisma.cita.create.mockResolvedValue(enrichedCita);
      mockPrisma.pago.create.mockResolvedValue({
        id: 'pago-1',
        folioPago: 'VET-20260606-0002',
        cantidad: 2000.0,
        estado: 'pendiente',
      });

      const result = await service.create(dtoValido, cliente);

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
      expect((result as any).mascota).not.toHaveProperty('propietarioId');
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
      mockPrisma.cita.create.mockResolvedValue(enrichedCita);

      const result = await service.create(dtoValido, cliente);

      expect(mockHistorialService.registrarCambio).toHaveBeenCalledWith(
        'cita-1',
        null,
        EstadoCita.pendiente_de_pago,
        cliente.sub,
        null,
      );
      expect((result as any).medico.nombreCompleto).toBe('Dra. Ana López');
    });
  });

  describe('findAll', () => {
    const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };

    it('should return enriched citas for admin', async () => {
      mockPrisma.cita.findMany.mockResolvedValue([enrichedCita]);

      const result = await service.findAll(admin);

      expect(result).toHaveLength(1);
      expect((result[0] as any).mascota.raza.nombre).toBe('Golden');
      expect((result[0] as any).mascota).not.toHaveProperty('propietarioId');
      expect((result[0] as any).medico.nombreCompleto).toBe('Dra. Ana López');
      expect((result[0] as any).sucursal.nombre).toBe('Sucursal Centro');
      expect(mockPrisma.cita.findMany).toHaveBeenCalled();
    });

    it('should return empty array for medico without citas', async () => {
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
    const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };

    it('should return enriched cita with receta and consulta', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        ...enrichedCita,
        receta: { id: 'rec-1', detalles: [] },
        consulta: { id: 'cons-1' },
      });

      const result = await service.findOne('cita-1', admin);

      expect((result as any).mascota.raza.nombre).toBe('Golden');
      expect((result as any).mascota).not.toHaveProperty('propietarioId');
      expect((result as any).medico.nombreCompleto).toBe('Dra. Ana López');
      expect((result as any).sucursal.nombre).toBe('Sucursal Centro');
      expect((result as any).receta).toEqual({ id: 'rec-1' });
      expect((result as any).consulta).toEqual({ id: 'cons-1' });
    });

    it('should throw NotFoundException for missing cita', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue(null);

      await expect(service.findOne('cita-1', admin)).rejects.toThrow(
        NotFoundException,
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
        ...enrichedCita,
        estado: EstadoCita.cancelada,
      });

      const result = await service.remove('cita-1', admin);

      expect(result.estado).toBe(EstadoCita.cancelada);
      expect((result as any).mascota).not.toHaveProperty('propietarioId');
      expect((result as any).medico.nombreCompleto).toBe('Dra. Ana López');
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
        ...enrichedCita,
        estado: EstadoCita.en_curso,
      });

      const result = await service.cambiarEstado(
        'cita-1',
        { estado: EstadoCita.en_curso },
        admin,
      );
      expect(result.estado).toBe(EstadoCita.en_curso);
      expect((result as any).mascota.raza.nombre).toBe('Golden');
      expect((result as any).medico.nombreCompleto).toBe('Dra. Ana López');
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

    it('debería rechazar cliente intentando cambiar estado', async () => {
      const clienteUser = {
        sub: 'user-1',
        email: 'test@test.com',
        rol: Rol.cliente,
      };
      mockPrisma.cita.findUnique.mockResolvedValue(baseCita);

      await expect(
        service.cambiarEstado(
          'cita-1',
          { estado: EstadoCita.en_curso },
          clienteUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('debería rechazar transición pendiente_de_pago → cancelada vía PATCH', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente_de_pago,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
        fecha: new Date(),
        horaInicio: new Date(1970, 0, 1, 10, 0),
      });

      await expect(
        service.cambiarEstado(
          'cita-1',
          { estado: EstadoCita.cancelada },
          admin,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('debería permitir en_curso → cancelada', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
        fecha: new Date(),
        horaInicio: new Date(1970, 0, 1, 0, 0),
      });
      mockPrisma.cita.update.mockResolvedValue({
        ...enrichedCita,
        estado: EstadoCita.cancelada,
      });

      const result = await service.cambiarEstado(
        'cita-1',
        { estado: EstadoCita.cancelada },
        admin,
      );
      expect(result.estado).toBe(EstadoCita.cancelada);
      expect((result as any).sucursal.nombre).toBe('Sucursal Centro');
    });
  });

  describe('remove edge cases', () => {
    const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };

    it('should reject canceling a completed cita', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.completada,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });

      await expect(service.remove('cita-1', admin)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cancel a pending cita without touching Pago', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.cita.update.mockResolvedValue({
        ...enrichedCita,
        estado: EstadoCita.cancelada,
      });

      const result = await service.remove('cita-1', admin);
      expect(result.estado).toBe(EstadoCita.cancelada);
      expect((result as any).mascota).not.toHaveProperty('propietarioId');
      expect(mockPrisma.pago.update).not.toHaveBeenCalled();
    });

    it('should cancel an en_curso cita', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.en_curso,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.cita.update.mockResolvedValue({
        ...enrichedCita,
        estado: EstadoCita.cancelada,
      });

      const result = await service.remove('cita-1', admin);
      expect(result.estado).toBe(EstadoCita.cancelada);
      expect((result as any).medico.especialidad).toBe('Cirugía');
      expect(mockPrisma.pago.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };

    it('should update motivo only', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
        fecha: new Date('2026-07-01'),
        horaInicio: new Date(1970, 0, 1, 10, 0),
      });
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'masc-1',
        propietarioId: admin.sub,
      });
      mockPrisma.cita.update.mockResolvedValue({
        ...enrichedCita,
        motivo: 'Nuevo motivo',
      });

      const result = await service.update(
        'cita-1',
        { motivo: 'Nuevo motivo' },
        admin,
      );
      expect(result.motivo).toBe('Nuevo motivo');
      expect((result as any).mascota.raza.nombre).toBe('Golden');
      expect((result as any).medico.nombreCompleto).toBe('Dra. Ana López');
    });

    it('should update fecha and revalidate overlaps', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.pendiente,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
        fecha: new Date('2026-07-01'),
        horaInicio: new Date(1970, 0, 1, 10, 0),
      });
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'masc-1',
        propietarioId: admin.sub,
      });
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        consultorioId: 'cons-1',
      });
      mockPrisma.cita.findMany.mockResolvedValue([]);
      mockPrisma.cita.update.mockResolvedValue({
        ...enrichedCita,
        fecha: new Date('2026-08-01'),
      });

      const result = await service.update(
        'cita-1',
        { fecha: '2026-08-01' },
        admin,
      );
      expect(result.fecha).toBeDefined();
      expect((result as any).sucursal.nombre).toBe('Sucursal Centro');
    });

    it('should reject updating a completed cita', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.completada,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
      });
      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: 'masc-1',
        propietarioId: admin.sub,
      });

      await expect(
        service.update('cita-1', { motivo: 'x' }, admin),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('booking validations', () => {
    const cliente = { sub: 'user-1', email: 'test@test.com', rol: Rol.cliente };
    const dto = {
      sucursalId: '550e8400-e29b-41d4-a716-446655440000',
      medicoId: '550e8400-e29b-41d4-a716-446655440001',
      mascotaId: '550e8400-e29b-41d4-a716-446655440002',
      servicioId: '550e8400-e29b-41d4-a716-446655440004',
      fecha: '2026-12-31',
      horaInicio: '10:00',
      motivo: 'Consulta general',
    };

    it('should reject booking more than 2 months ahead', async () => {
      const fechaLejana = new Date();
      fechaLejana.setMonth(fechaLejana.getMonth() + 3);
      const dtoLejano = {
        ...dto,
        fecha: fechaLejana.toISOString().split('T')[0],
      };

      mockPrisma.mascota.findUnique.mockResolvedValue({
        id: dto.mascotaId,
        propietarioId: cliente.sub,
      });

      await expect(service.create(dtoLejano, cliente)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject doctor overlap', async () => {
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
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.cita.findMany.mockResolvedValue([
        {
          id: 'cita-existe',
          horaInicio: new Date(1970, 0, 1, 9, 30),
          horaFin: new Date(1970, 0, 1, 10, 30),
        },
      ]);

      await expect(service.create(dtoValido, cliente)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject consultorio overlap', async () => {
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
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([
        { medicoId: 'otro-med', consultorioId: 'cons-1' },
      ]);
      mockPrisma.cita.findMany.mockImplementation((args: any) => {
        if (args.where?.medicoId && !args.where.medicoId?.in) {
          return Promise.resolve([]);
        }
        if (args.where?.medicoId?.in) {
          return Promise.resolve([
            {
              id: 'cita-cons',
              horaInicio: new Date(1970, 0, 1, 9, 30),
              horaFin: new Date(1970, 0, 1, 10, 30),
            },
          ]);
        }
        return Promise.resolve([]);
      });

      await expect(service.create(dtoValido, cliente)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject patient same-branch overlap', async () => {
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
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.cita.findMany.mockImplementation((args: any) => {
        if (args.where?.medicoId && !args.where.medicoId?.in) {
          return Promise.resolve([]);
        }
        if (args.where?.medicoId?.in) {
          return Promise.resolve([]);
        }
        if (
          args.where?.mascotaId &&
          args.where?.sucursalId &&
          !args.where.sucursalId?.not
        ) {
          return Promise.resolve([
            {
              id: 'cita-pac',
              horaInicio: new Date(1970, 0, 1, 9, 30),
              horaFin: new Date(1970, 0, 1, 10, 30),
            },
          ]);
        }
        return Promise.resolve([]);
      });

      await expect(service.create(dtoValido, cliente)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject cross-branch less than 2h gap', async () => {
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
      mockPrisma.medicoHorario.findFirst.mockResolvedValue({
        id: 'h1',
        medicoId: dto.medicoId,
        consultorioId: 'cons-1',
      });
      mockPrisma.medicoHorario.findMany.mockResolvedValue([]);
      mockPrisma.cita.findMany.mockImplementation((args: any) => {
        if (args.where?.medicoId && !args.where.medicoId?.in) {
          return Promise.resolve([]);
        }
        if (args.where?.medicoId?.in) {
          return Promise.resolve([]);
        }
        if (
          args.where?.mascotaId &&
          args.where?.sucursalId &&
          !args.where.sucursalId?.not
        ) {
          return Promise.resolve([]);
        }
        if (args.where?.mascotaId && args.where?.sucursalId?.not) {
          return Promise.resolve([
            {
              id: 'cita-cruz',
              sucursalId: 'otra-suc',
              horaInicio: new Date(1970, 0, 1, 9, 0),
            },
          ]);
        }
        return Promise.resolve([]);
      });

      await expect(service.create(dtoValido, cliente)).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
