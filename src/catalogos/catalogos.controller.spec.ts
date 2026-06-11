/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

describe('CatalogosController', () => {
  let app: INestApplication;

  const mockService = {
    findAllEspecies: jest.fn(),
    findAllRazas: jest.fn(),
    findAllColores: jest.fn(),
    findAllTiposPelo: jest.fn(),
    findAllPatronesPelo: jest.fn(),
    findAllComportamientos: jest.fn(),
    findAllAlergias: jest.fn(),
    findServicios: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogosController],
      providers: [{ provide: CatalogosService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest
          .fn()
          .mockImplementation((context: ExecutionContext) => {
            const req = context
              .switchToHttp()
              .getRequest<{ user?: { sub: string } }>();
            req.user = { sub: '00000000-0000-4000-8000-000000000001' };
            return true;
          }),
      })
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /catalogos/especies', () => {
    it('should return 200 with species array', async () => {
      mockService.findAllEspecies.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Canino' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/especies')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Canino' }]);
      expect(mockService.findAllEspecies).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /catalogos/razas', () => {
    it('should return 200 with all breeds when no query', async () => {
      mockService.findAllRazas.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Labrador' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/razas')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Labrador' }]);
      expect(mockService.findAllRazas).toHaveBeenCalledWith(undefined);
    });

    it('should return 200 with filtered breeds when valid especieId provided', async () => {
      mockService.findAllRazas.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Siamés' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/razas?especieId=00000000-0000-4000-8000-000000000001')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Siamés' }]);
      expect(mockService.findAllRazas).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000001',
      );
    });

    it('should return 400 when especieId is invalid', async () => {
      const response = await request(app.getHttpServer())
        .get('/catalogos/razas?especieId=invalid-uuid')
        .expect(400);

      expect(response.status).toBe(400);
      expect(mockService.findAllRazas).not.toHaveBeenCalled();
    });
  });

  describe('GET /catalogos/colores', () => {
    it('should return 200 with colors array', async () => {
      mockService.findAllColores.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Negro' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/colores')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Negro' }]);
    });
  });

  describe('GET /catalogos/tipos-pelo', () => {
    it('should return 200 with hair types array', async () => {
      mockService.findAllTiposPelo.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Corto' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/tipos-pelo')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Corto' }]);
    });
  });

  describe('GET /catalogos/patrones-pelo', () => {
    it('should return 200 with hair patterns array', async () => {
      mockService.findAllPatronesPelo.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Sólido' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/patrones-pelo')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Sólido' }]);
    });
  });

  describe('GET /catalogos/comportamientos', () => {
    it('should return 200 with behaviors array', async () => {
      mockService.findAllComportamientos.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Tranquilo' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/comportamientos')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Tranquilo' }]);
    });
  });

  describe('GET /catalogos/alergias', () => {
    it('should return 200 with allergies array', async () => {
      mockService.findAllAlergias.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Polen' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/alergias')
        .expect(200);

      expect(response.body).toEqual([{ id: 'uuid-1', nombre: 'Polen' }]);
    });
  });

  describe('GET /catalogos/servicios', () => {
    it('should return 200 with services array ordered by nombre', async () => {
      mockService.findServicios.mockResolvedValue([
        { id: 'uuid-1', nombre: 'Consulta general', precioBase: '350.00' },
        { id: 'uuid-2', nombre: 'Vacunación', precioBase: '150.00' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/catalogos/servicios')
        .expect(200);

      expect(response.body).toEqual([
        { id: 'uuid-1', nombre: 'Consulta general', precioBase: '350.00' },
        { id: 'uuid-2', nombre: 'Vacunación', precioBase: '150.00' },
      ]);
      expect(mockService.findServicios).toHaveBeenCalledTimes(1);
    });

    it('should have JwtAuthGuard at class level', () => {
      const guards = Reflect.getMetadata(
        GUARDS_METADATA,
        CatalogosController,
      ) as (new (...args: unknown[]) => unknown)[];
      expect(guards).toBeDefined();
      expect(guards.some((guard) => guard === JwtAuthGuard)).toBe(true);
    });
  });

  describe('Auth — GET /catalogos/servicios without JWT', () => {
    it('should return 401 when JwtAuthGuard rejects', async () => {
      const module: TestingModule = await Test.createTestingModule({
        controllers: [CatalogosController],
        providers: [{ provide: CatalogosService, useValue: mockService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: jest.fn().mockImplementation(() => {
            throw new UnauthorizedException();
          }),
        })
        .compile();

      const rejectedApp = module.createNestApplication();
      await rejectedApp.init();

      const response = await request(rejectedApp.getHttpServer()).get(
        '/catalogos/servicios',
      );

      expect(response.status).toBe(401);
      await rejectedApp.close();
    });
  });
});
