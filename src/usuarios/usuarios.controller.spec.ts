/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';

describe('UsuariosController', () => {
  let app: INestApplication;

  const mockService = {
    search: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [{ provide: UsuariosService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest
          .fn()
          .mockImplementation((context: ExecutionContext) => {
            const req = context
              .switchToHttp()
              .getRequest<{ user?: { sub: string; rol: Rol } }>();
            req.user = {
              sub: '00000000-0000-4000-8000-000000000001',
              rol: Rol.medico,
            };
            return true;
          }),
      })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /usuarios', () => {
    it('should have @Roles(Rol.medico, Rol.admin) metadata', () => {
      const reflector = new Reflector();
      const roles = reflector.get<Rol[]>(ROLES_KEY, UsuariosController);
      expect(roles).toEqual(expect.arrayContaining([Rol.medico, Rol.admin]));
    });

    it('should have @UseGuards(RolesGuard) metadata', () => {
      const searchHandler = (
        UsuariosController.prototype as unknown as Record<string, unknown>
      ).search as () => void;
      const methodGuards = (Reflect.getMetadata('__guards__', searchHandler) ??
        []) as (new (...args: unknown[]) => unknown)[];
      const classGuards = (Reflect.getMetadata(
        '__guards__',
        UsuariosController,
      ) ?? []) as (new (...args: unknown[]) => unknown)[];

      const allGuards = [...(methodGuards ?? []), ...(classGuards ?? [])];
      expect(
        allGuards.some(
          (guard) => guard === RolesGuard || guard.name === 'RolesGuard',
        ),
      ).toBe(true);
    });

    it('should delegate validated query DTO to usuariosService.search()', async () => {
      const mockResult = {
        data: [
          {
            id: '00000000-0000-4000-8000-000000000001',
            email: 'juan@example.com',
            telefono: '5551234567',
            nombreCompleto: 'Juan Pérez',
          },
        ],
        total: 1,
      };
      mockService.search.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .get('/usuarios?search=Juan&rol=cliente&limit=10&offset=5')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockService.search).toHaveBeenCalledTimes(1);
    });

    it('should reject cliente role with 403 via RolesGuard', () => {
      const reflector = new Reflector();
      const guard = new RolesGuard(reflector);

      const searchHandler = (
        UsuariosController.prototype as unknown as Record<string, unknown>
      ).search as () => void;

      const context: ExecutionContext = {
        switchToHttp: () => ({
          getRequest: () => ({ user: { rol: Rol.cliente } }),
        }),
        getHandler: () => searchHandler,
        getClass: () => UsuariosController,
      } as unknown as ExecutionContext;

      expect(() => guard.canActivate(context)).toThrow(
        'No tienes permiso para realizar esta acción.',
      );
    });
  });
});
