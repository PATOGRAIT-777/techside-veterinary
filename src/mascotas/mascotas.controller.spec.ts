/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { MascotasController } from './mascotas.controller';
import { MascotasService } from './mascotas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

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
              .getRequest<{ user?: { sub: string } }>();
            req.user = { sub: ownerId };
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

  describe('POST /mascotas', () => {
    it('should return 201 for valid pet creation', async () => {
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
        ownerId,
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
