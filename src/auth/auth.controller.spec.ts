import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  UnauthorizedException,
  BadRequestException,
  ExecutionContext,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { Rol } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let app: INestApplication;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    verifyEmail: jest.fn(),
    resendConfirmation: jest.fn(),
  };

  let mockUser: { sub: string; email: string; rol: Rol } | undefined =
    undefined;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockUser = undefined;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue({
        canActivate: jest
          .fn()
          .mockImplementation((context: ExecutionContext) => {
            const req = context.switchToHttp().getRequest<{
              user?: typeof mockUser;
            }>();
            req.user = mockUser;
            return true;
          }),
      })
      .compile();

    controller = module.get<AuthController>(AuthController);
    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/login', () => {
    it('should return 200 for valid credentials', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'valid-token',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'test@example.com',
          rol: 'cliente',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ emailOrPhone: 'test@example.com', password: 'Password123' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        accessToken: 'valid-token',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'test@example.com',
          rol: 'cliente',
        },
      });
    });

    it('should return 400 for invalid body (missing password)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ emailOrPhone: 'test@example.com' })
        .expect(400);

      expect((response.body as { statusCode: number }).statusCode).toBe(400);
      expect((response.body as { details: unknown }).details).toBeDefined();
    });

    it('should return 400 for password too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ emailOrPhone: 'test@example.com', password: 'short' })
        .expect(400);

      expect((response.body as { statusCode: number }).statusCode).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException(
          'Credenciales inválidas. Inténtalo de nuevo.',
        ),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ emailOrPhone: 'test@example.com', password: 'Password123' })
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /auth/register', () => {
    it('should return 201 for valid registration (cliente, no auth)', async () => {
      mockAuthService.register.mockResolvedValue({
        message: 'Te enviamos un correo para continuar...',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'new@example.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Juan Pérez')
        .field('telefono', '15512345678')
        .field('calle', 'Av. Principal 100')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockAuthService.register).toHaveBeenCalled();
    });

    it('should return 201 generic message for medico without auth (hidden failure)', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'medico@example.com')
        .field('password', 'Password123')
        .field('rol', 'medico')
        .field('nombreCompleto', 'Dr. Juan')
        .field('telefono', '15512345678')
        .field('calle', 'Av. Principal 100')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 201 for medico registered by admin', async () => {
      mockUser = {
        sub: '00000000-0000-4000-8000-000000000001',
        email: 'admin@vetec.local',
        rol: 'admin',
      };
      mockAuthService.register.mockResolvedValue({
        message: 'Te enviamos un correo para continuar...',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'medico@example.com')
        .field('password', 'Password123')
        .field('rol', 'medico')
        .field('nombreCompleto', 'Dr. Juan')
        .field('telefono', '15512345678')
        .field('calle', 'Av. Principal 100')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockAuthService.register).toHaveBeenCalled();
    });

    it('should return 201 generic message for admin by medico (hidden failure)', async () => {
      mockUser = {
        sub: '00000000-0000-4000-8000-000000000002',
        email: 'medico@vetec.local',
        rol: 'medico',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'newadmin@example.com')
        .field('password', 'Password123')
        .field('rol', 'admin')
        .field('nombreCompleto', 'Admin Nuevo')
        .field('telefono', '15512345678')
        .field('calle', 'Av. Principal 100')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockAuthService.register).not.toHaveBeenCalled();
    });

    it('should return 201 for admin registered by admin', async () => {
      mockUser = {
        sub: '00000000-0000-4000-8000-000000000001',
        email: 'admin@vetec.local',
        rol: 'admin',
      };
      mockAuthService.register.mockResolvedValue({
        message: 'Te enviamos un correo para continuar...',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'newadmin@example.com')
        .field('password', 'Password123')
        .field('rol', 'admin')
        .field('nombreCompleto', 'Admin Nuevo')
        .field('telefono', '15512345678')
        .field('calle', 'Av. Principal 100')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockAuthService.register).toHaveBeenCalled();
    });

    it('should return 400 for missing files', async () => {
      mockAuthService.register.mockRejectedValue(
        new UnauthorizedException('Missing files'),
      );

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'new@example.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Juan Pérez')
        .field('telefono', '15512345678')
        .field('calle', 'Av. Principal 100')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should return 400 for invalid file type', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'new@example.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Juan Pérez')
        .field('telefono', '15512345678')
        .field('calle', 'Av. Principal 100')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('exe'), 'virus.exe')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid Zod body', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'not-an-email')
        .field('password', 'short')
        .field('rol', 'invalid')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(400);
      expect((response.body as { details: unknown }).details).toBeDefined();
    });
  });

  describe('GET /auth/verify', () => {
    it('should return 200 for valid token', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        message: 'Tu cuenta ha sido activada exitosamente.',
      });

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .query({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Tu cuenta ha sido activada exitosamente.',
      });
      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('valid-token');
    });

    it('should return 400 for invalid token', async () => {
      mockAuthService.verifyEmail.mockRejectedValue(
        new BadRequestException(
          'El enlace de verificación es inválido, ha expirado o ya fue utilizado.',
        ),
      );

      const response = await request(app.getHttpServer())
        .get('/auth/verify')
        .query({ token: 'invalid-token' });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /auth/resend-confirmation', () => {
    it('should return 200 for valid email', async () => {
      mockAuthService.resendConfirmation.mockResolvedValue({
        message: 'Te enviamos un correo para continuar...',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/resend-confirmation')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockAuthService.resendConfirmation).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-confirmation')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
    });
  });
});
