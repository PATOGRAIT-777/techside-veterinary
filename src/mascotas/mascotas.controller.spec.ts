/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { Rol } from '@prisma/client';
import { MascotasController } from './mascotas.controller';
import { MascotasService } from './mascotas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import {
  THROTTLER_LIMIT,
  THROTTLER_TTL,
} from '@nestjs/throttler/dist/throttler.constants';

describe('MascotasController', () => {
  let app: INestApplication;

  const mockService = {
    create: jest.fn(),
    findAllByOwner: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const ownerId = '00000000-0000-4000-8000-000000000001';
  const mascotaId = '00000000-0000-4000-8000-000000000002';

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MascotasController],
      providers: [{ provide: MascotasService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest
          .fn()
          .mockImplementation((context: ExecutionContext) => {
            const req = context
              .switchToHttp()
              .getRequest<{ user?: { sub: string; rol: Rol } }>();
            req.user = { sub: ownerId, rol: Rol.cliente };
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

  describe('metadata', () => {
    it('should apply @Throttle({ default: { limit: 8, ttl: 60000 } }) on create()', () => {
      const limit = Reflect.getMetadata(
        `${THROTTLER_LIMIT}default`,
        MascotasController.prototype.create,
      );
      const ttl = Reflect.getMetadata(
        `${THROTTLER_TTL}default`,
        MascotasController.prototype.create,
      );
      expect(limit).toBe(8);
      expect(ttl).toBe(60000);
    });

    it('should apply @Roles(Rol.cliente, Rol.medico, Rol.admin) on create()', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        MascotasController.prototype.create,
      );
      expect(roles).toEqual([Rol.cliente, Rol.medico, Rol.admin]);
    });

    it('should apply @UseGuards(RolesGuard) on create()', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        MascotasController.prototype.create,
      );
      expect(guards).toContain(RolesGuard);
    });
  });

  describe('POST /mascotas', () => {
    it('should pass full user payload { sub, rol } to service.create()', async () => {
      mockService.create.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais',
      });

      const response = await request(app.getHttpServer())
        .post('/mascotas')
        .field('nombre', 'Firulais')
        .field('razaId', '00000000-0000-4000-8000-000000000003')
        .attach('foto', Buffer.from('jpg'), 'foto.jpg')
        .attach('carnet', Buffer.from('pdf'), 'carnet.pdf');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ id: mascotaId, nombre: 'Firulais' });
      expect(mockService.create).toHaveBeenCalledWith(
        { sub: ownerId, rol: Rol.cliente },
        expect.objectContaining({
          nombre: 'Firulais',
          razaId: '00000000-0000-4000-8000-000000000003',
        }),
        expect.objectContaining({
          foto: expect.objectContaining({
            originalname: 'foto.jpg',
            mimetype: 'image/jpeg',
          }),
          carnet: expect.objectContaining({
            originalname: 'carnet.pdf',
            mimetype: 'application/pdf',
          }),
        }),
      );
    });

    it('should return 400 for invalid body', async () => {
      const response = await request(app.getHttpServer())
        .post('/mascotas')
        .field('nombre', '');

      expect(response.status).toBe(400);
      expect(mockService.create).not.toHaveBeenCalled();
    });

    it('should reject medico request missing propietarioId via service BadRequestException', async () => {
      mockService.create.mockRejectedValue(
        new BadRequestException(
          'El propietario es obligatorio para registrar una mascota en este rol.',
        ),
      );

      const module: TestingModule = await Test.createTestingModule({
        controllers: [MascotasController],
        providers: [{ provide: MascotasService, useValue: mockService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: jest
            .fn()
            .mockImplementation((context: ExecutionContext) => {
              const req = context
                .switchToHttp()
                .getRequest<{ user?: { sub: string; rol: Rol } }>();
              req.user = { sub: ownerId, rol: Rol.medico };
              return true;
            }),
        })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const localApp = module.createNestApplication();
      await localApp.init();

      const response = await request(localApp.getHttpServer())
        .post('/mascotas')
        .field('nombre', 'Firulais');

      expect(response.status).toBe(400);
      expect((response.body as { message: string }).message).toBe(
        'El propietario es obligatorio para registrar una mascota en este rol.',
      );

      await localApp.close();
    });
  });

  describe('GET /mascotas', () => {
    it('should return 200 with pets array', async () => {
      mockService.findAllByOwner.mockResolvedValue([
        { id: mascotaId, nombre: 'Firulais' },
      ]);

      const response = await request(app.getHttpServer())
        .get('/mascotas')
        .expect(200);

      expect(response.body).toEqual([{ id: mascotaId, nombre: 'Firulais' }]);
      expect(mockService.findAllByOwner).toHaveBeenCalledWith(ownerId);
    });
  });

  describe('GET /mascotas/:id', () => {
    it('should return 200 for existing pet', async () => {
      mockService.findOne.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais',
      });

      const response = await request(app.getHttpServer())
        .get(`/mascotas/${mascotaId}`)
        .expect(200);

      expect(response.body).toEqual({ id: mascotaId, nombre: 'Firulais' });
      expect(mockService.findOne).toHaveBeenCalledWith(mascotaId, ownerId);
    });

    it('should return 404 for missing pet', async () => {
      mockService.findOne.mockRejectedValue({
        statusCode: 404,
        message: 'Mascota no encontrada',
      });

      const response = await request(app.getHttpServer())
        .get(`/mascotas/${mascotaId}`)
        .expect(404);

      expect(response.status).toBe(404);
      expect(mockService.findOne).toHaveBeenCalledWith(mascotaId, ownerId);
    });
  });

  describe('PATCH /mascotas/:id', () => {
    it('should return 200 for valid update', async () => {
      mockService.update.mockResolvedValue({
        id: mascotaId,
        nombre: 'Firulais II',
      });

      const response = await request(app.getHttpServer())
        .patch(`/mascotas/${mascotaId}`)
        .field('nombre', 'Firulais II')
        .attach('foto', Buffer.from('jpg'), 'foto.jpg');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: mascotaId, nombre: 'Firulais II' });
      expect(mockService.update).toHaveBeenCalledWith(
        mascotaId,
        ownerId,
        expect.objectContaining({ nombre: 'Firulais II' }),
        expect.objectContaining({
          foto: expect.objectContaining({
            originalname: 'foto.jpg',
            mimetype: 'image/jpeg',
          }),
        }),
      );
    });
  });
});
