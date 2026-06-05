import { Test, TestingModule } from '@nestjs/testing';
import { CitasService } from './citas.service';
import { PrismaService } from '../prisma/prisma.service';
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
    },
    medicoHorario: {
      findMany: jest.fn(),
    },
    sucursal: {
      findFirst: jest.fn(),
    },
    consultorio: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitasService,
        { provide: PrismaService, useValue: mockPrisma },
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
      consultorioId: '550e8400-e29b-41d4-a716-446655440003',
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

    it('debería crear una cita válida', async () => {
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
      mockPrisma.cita.create.mockResolvedValue({
        id: 'cita-1',
        ...dtoValido,
        estado: EstadoCita.pendiente,
      });

      const result = await service.create(dtoValido, cliente);
      expect(result.estado).toBe(EstadoCita.pendiente);
      expect(mockPrisma.cita.create).toHaveBeenCalled();
    });
  });

  describe('cambiarEstado', () => {
    const admin = { sub: 'admin-1', email: 'admin@test.com', rol: Rol.admin };

    it('debería rechazar transición inválida', async () => {
      mockPrisma.cita.findUnique.mockResolvedValue({
        id: 'cita-1',
        estado: EstadoCita.completada,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
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
        id: 'cita-1',
        estado: EstadoCita.pendiente,
        medicoId: 'med-1',
        mascotaId: 'masc-1',
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
    });
  });
});
