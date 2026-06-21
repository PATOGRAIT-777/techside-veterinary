import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Rol, EstadoPago } from '@prisma/client';

describe('PagosController', () => {
  let app: INestApplication;

  const mockService = {
    findAll: jest.fn(),
    findByFolio: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PagosController],
      providers: [{ provide: PagosService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest
          .fn()
          .mockImplementation((context: ExecutionContext) => {
            const req = context
              .switchToHttp()
              .getRequest<{ user?: { sub: string; rol: Rol } }>();
            req.user = { sub: 'user-1', rol: Rol.cliente };
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

  describe('GET /api/v1/pagos', () => {
    it('should delegate to pagosService.findAll with default query values', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, limit: 20, offset: 0 },
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .get('/api/v1/pagos')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockService.findAll).toHaveBeenCalledTimes(1);
      expect(mockService.findAll).toHaveBeenCalledWith(
        { limit: 20, offset: 0 },
        expect.objectContaining({ sub: 'user-1', rol: Rol.cliente }),
      );
    });

    it('should pass explicit estado, limit, and offset after pipe validation', async () => {
      const mockResult = {
        data: [],
        meta: { total: 0, limit: 10, offset: 5 },
      };
      mockService.findAll.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .get('/api/v1/pagos?estado=' + EstadoPago.pagada + '&limit=10&offset=5')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockService.findAll).toHaveBeenCalledWith(
        { estado: EstadoPago.pagada, limit: 10, offset: 5 },
        expect.objectContaining({ sub: 'user-1', rol: Rol.cliente }),
      );
    });

    it('should reject negative offset with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/pagos?offset=-5')
        .expect(400);

      expect(mockService.findAll).not.toHaveBeenCalled();
    });

    it('should reject invalid estado with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/pagos?estado=invalido')
        .expect(400);

      expect(mockService.findAll).not.toHaveBeenCalled();
    });

    it('should reject non-numeric limit with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/pagos?limit=abc')
        .expect(400);

      expect(mockService.findAll).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/pagos/:folioPago', () => {
    it('should delegate to pagosService.findByFolio with current user', async () => {
      const mockResult = { id: 'pago-1', folioPago: 'VET-20240115-0001' };
      mockService.findByFolio.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .get('/api/v1/pagos/VET-20240115-0001')
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(mockService.findByFolio).toHaveBeenCalledWith(
        'VET-20240115-0001',
        expect.objectContaining({ sub: 'user-1', rol: Rol.cliente }),
      );
    });
  });

  describe('POST /api/v1/pagos', () => {
    it('should delegate to pagosService.create unchanged', async () => {
      const mockResult = { id: 'pago-1', folioPago: 'VET-20240115-0001' };
      mockService.create.mockResolvedValue(mockResult);

      const response = await request(app.getHttpServer())
        .post('/api/v1/pagos')
        .send({ folioPago: 'VET-20240115-0001' })
        .expect(201);

      expect(response.body).toEqual(mockResult);
      expect(mockService.create).toHaveBeenCalledWith({
        folioPago: 'VET-20240115-0001',
      });
    });
  });
});
