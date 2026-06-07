import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminHistorialController } from './admin-historial.controller';
import { HistorialMedicoService } from './historial-medico.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';

const UUID_M1 = 'aaaaaaaa-1111-1111-a111-111111111111';
const UUID_U1 = 'bbbbbbbb-2222-2222-b222-222222222222';
const UUID_D1 = 'cccccccc-3333-3333-8333-333333333333';
const UUID_M2 = 'dddddddd-4444-4444-a444-444444444444';
const UUID_M10 = 'eeeeeeee-5555-5555-b555-555555555555';

describe('AdminHistorialController', () => {
  let controller: AdminHistorialController;

  const mockService = {
    getAdminMascotas: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminHistorialController],
      providers: [{ provide: HistorialMedicoService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminHistorialController>(AdminHistorialController);
    mockService.getAdminMascotas.mockReset();
  });

  describe('listarMascotas', () => {
    it('TC-ADMIN-01: admin can list all mascotas', async () => {
      const mockResult = {
        data: [
          {
            mascotaId: UUID_M1,
            mascotaNombre: 'Fido',
            propietarioNombre: 'Juan Perez',
            propietarioEmail: 'juan@test.com',
            ultimaCitaFecha: new Date('2024-06-01'),
            totalCitas: 5,
            totalCitasCompletadas: 3,
          },
        ],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      };
      mockService.getAdminMascotas.mockResolvedValue(mockResult);

      const result = await controller.listarMascotas({});

      expect(mockService.getAdminMascotas).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('TC-ADMIN-03: filter by mascotaId', async () => {
      const mockResult = {
        data: [
          {
            mascotaId: UUID_M1,
            mascotaNombre: 'Fido',
            propietarioNombre: 'Juan Perez',
            propietarioEmail: 'juan@test.com',
            ultimaCitaFecha: null,
            totalCitas: 0,
            totalCitasCompletadas: 0,
          },
        ],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      };
      mockService.getAdminMascotas.mockResolvedValue(mockResult);

      const result = await controller.listarMascotas({
        mascotaId: UUID_M1,
      });

      expect(mockService.getAdminMascotas).toHaveBeenCalledWith(
        expect.objectContaining({ mascotaId: UUID_M1 }),
      );
      expect(result.data[0].mascotaId).toBe(UUID_M1);
    });

    it('TC-ADMIN-04: filter by usuarioId', async () => {
      const mockResult = {
        data: [
          {
            mascotaId: UUID_M1,
            mascotaNombre: 'Fido',
            propietarioNombre: 'Juan Perez',
            propietarioEmail: 'juan@test.com',
            ultimaCitaFecha: new Date('2024-01-15'),
            totalCitas: 2,
            totalCitasCompletadas: 1,
          },
          {
            mascotaId: UUID_M2,
            mascotaNombre: 'Luna',
            propietarioNombre: 'Juan Perez',
            propietarioEmail: 'juan@test.com',
            ultimaCitaFecha: null,
            totalCitas: 0,
            totalCitasCompletadas: 0,
          },
        ],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      };
      mockService.getAdminMascotas.mockResolvedValue(mockResult);

      const result = await controller.listarMascotas({
        usuarioId: UUID_U1,
      });

      expect(mockService.getAdminMascotas).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: UUID_U1 }),
      );
      expect(result.data.length).toBe(2);
    });

    it('TC-ADMIN-05: filter by medicoId', async () => {
      mockService.getAdminMascotas.mockResolvedValue({
        data: [
          {
            mascotaId: UUID_M1,
            mascotaNombre: 'Fido',
            propietarioNombre: 'Juan Perez',
            propietarioEmail: 'juan@test.com',
            ultimaCitaFecha: new Date('2024-03-10'),
            totalCitas: 3,
            totalCitasCompletadas: 2,
          },
        ],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      });

      await controller.listarMascotas({ medicoId: UUID_D1 });

      expect(mockService.getAdminMascotas).toHaveBeenCalledWith(
        expect.objectContaining({ medicoId: UUID_D1 }),
      );
    });

    it('TC-ADMIN-06: filter by fechaDesde and fechaHasta', async () => {
      mockService.getAdminMascotas.mockResolvedValue({
        data: [
          {
            mascotaId: UUID_M1,
            mascotaNombre: 'Fido',
            propietarioNombre: 'Juan Perez',
            propietarioEmail: 'juan@test.com',
            ultimaCitaFecha: new Date('2024-01-15'),
            totalCitas: 1,
            totalCitasCompletadas: 1,
          },
        ],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      });

      await controller.listarMascotas({
        fechaDesde: '2024-01-01',
        fechaHasta: '2024-03-31',
      });

      expect(mockService.getAdminMascotas).toHaveBeenCalledWith(
        expect.objectContaining({
          fechaDesde: '2024-01-01',
          fechaHasta: '2024-03-31',
        }),
      );
    });

    it('TC-ADMIN-07: combined filters', async () => {
      mockService.getAdminMascotas.mockResolvedValue({
        data: [
          {
            mascotaId: UUID_M1,
            mascotaNombre: 'Fido',
            propietarioNombre: 'Juan Perez',
            propietarioEmail: 'juan@test.com',
            ultimaCitaFecha: new Date('2024-02-20'),
            totalCitas: 2,
            totalCitasCompletadas: 1,
          },
        ],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      });

      await controller.listarMascotas({
        usuarioId: UUID_U1,
        medicoId: UUID_D1,
      });

      expect(mockService.getAdminMascotas).toHaveBeenCalledWith(
        expect.objectContaining({
          usuarioId: UUID_U1,
          medicoId: UUID_D1,
        }),
      );
    });

    it('TC-ADMIN-08: cursor pagination', async () => {
      mockService.getAdminMascotas.mockResolvedValue({
        data: Array.from({ length: 10 }, (_, i) => ({
          mascotaId: `aaaaaaaa-1111-1111-a111-1111111111${String(i + 1).padStart(2, '0')}`,
          mascotaNombre: 'Mascota ' + (i + 1),
          propietarioNombre: 'Juan Perez',
          propietarioEmail: 'juan@test.com',
          ultimaCitaFecha: null,
          totalCitas: 0,
          totalCitasCompletadas: 0,
        })),
        meta: {
          nextCursor: 'cursor123',
          limit: 10,
          hasMore: true,
        },
      });

      const result = await controller.listarMascotas({
        limit: '10',
      });

      expect(result.data.length).toBe(10);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.nextCursor).toBe('cursor123');
    });

    it('TC-ADMIN-09: fechaDesde > fechaHasta returns 400', async () => {
      await expect(
        controller.listarMascotas({
          fechaDesde: '2024-12-31',
          fechaHasta: '2024-01-01',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('TC-ADMIN-10: mascota without citas shows 0 counts', async () => {
      mockService.getAdminMascotas.mockResolvedValue({
        data: [
          {
            mascotaId: UUID_M10,
            mascotaNombre: 'SinCitas',
            propietarioNombre: 'Ana Lopez',
            propietarioEmail: 'ana@test.com',
            ultimaCitaFecha: null,
            totalCitas: 0,
            totalCitasCompletadas: 0,
          },
        ],
        meta: { nextCursor: null, limit: 20, hasMore: false },
      });

      const result = await controller.listarMascotas({});

      expect(result.data[0].totalCitas).toBe(0);
      expect(result.data[0].totalCitasCompletadas).toBe(0);
      expect(result.data[0].ultimaCitaFecha).toBeNull();
    });

    it('TC-ADMIN-11: limit clamped to 100', async () => {
      mockService.getAdminMascotas.mockResolvedValue({
        data: [],
        meta: { nextCursor: null, limit: 100, hasMore: false },
      });

      await controller.listarMascotas({ limit: '500' });

      expect(mockService.getAdminMascotas).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 }),
      );
    });
  });

  describe('RBAC', () => {
    it('TC-ADMIN-02: controller requires admin role', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Rol[]>(ROLES_KEY, AdminHistorialController);
      expect(roles).toContain(Rol.admin);
    });
  });
});
