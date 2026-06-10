/**
 * Email Verification Integration Test
 *
 * This is an integration test (not a true E2E) that validates the HTTP
 * contracts of the email verification flow. It mocks external dependencies
 * (Prisma, Bull queue, bcrypt) because the project does not yet have a
 * dedicated test database or Redis instance for E2E testing.
 *
 * TODO: Convert to a true E2E test once a test database and Redis
 * infrastructure are available in the CI environment.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
jest.mock('@nestjs/bull', () => ({
  BullModule: {
    forRootAsync: jest.fn().mockReturnValue({
      module: class MockBullRootModule {},
    }),
    registerQueue: jest.fn().mockReturnValue({
      module: class MockBullQueueModule {},
    }),
  },
  InjectQueue: jest.fn().mockReturnValue(function () {}),
  getQueueToken: jest
    .fn()
    .mockImplementation((name: string) => `BullQueue_${name}`),
  Processor: jest.fn().mockReturnValue(function () {}),
  Process: jest.fn().mockReturnValue(function () {}),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ArchivosService } from '../../src/archivos/archivos.service';
import { UsuariosService } from '../../src/usuarios/usuarios.service';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../src/config/env.validation';
import { getQueueToken } from '@nestjs/bull';

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed-password'),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

describe('Email Verification (e2e)', () => {
  let app: INestApplication<App>;
  let mockPrisma: Record<string, any>;
  let mockArchivos: Record<string, jest.Mock>;
  let mockUsuarios: Record<string, jest.Mock>;
  let mockEmailQueue: { add: jest.Mock };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb: (prisma: unknown) => unknown) =>
        cb(mockPrisma),
      ),
      $disconnect: jest.fn(),
      mxDivision: {
        findFirst: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000000001',
          activo: true,
        }),
      },
      persona: {
        create: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-00000000000a',
          nombreCompleto: 'Test User',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000000014',
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      archivo: {
        create: jest
          .fn()
          .mockResolvedValueOnce({
            id: '00000000-0000-4000-8000-00000000001e',
          })
          .mockResolvedValueOnce({
            id: '00000000-0000-4000-8000-00000000001f',
          }),
      },
      emailVerificationToken: {
        create: jest.fn().mockResolvedValue({
          id: '00000000-0000-4000-8000-000000000020',
          token: 'valid-token-123',
          expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
          usedAt: null,
          usuarioId: '00000000-0000-4000-8000-000000000014',
        }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockArchivos = {
      saveFile: jest.fn().mockReturnValue('./uploads/test-file.pdf'),
      deleteFile: jest.fn(),
    };

    mockUsuarios = {
      findByEmailOrPhone: jest.fn(),
      hashPassword: jest.fn().mockResolvedValue('hashed-password'),
      createUser: jest.fn(),
    };

    mockEmailQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-id-123' }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(ArchivosService)
      .useValue(mockArchivos)
      .overrideProvider(UsuariosService)
      .useValue(mockUsuarios)
      .overrideProvider(getQueueToken('email-queue'))
      .useValue(mockEmailQueue)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should create verification token and enqueue email for new user', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'newuser@test.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Test User')
        .field('telefono', '15512345678')
        .field('calle', 'Calle Test')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuarioId: '00000000-0000-4000-8000-000000000014',
            token: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-verification',
        expect.objectContaining({
          to: 'newuser@test.com',
          userName: 'Test User',
          token: expect.any(String),
        }),
        expect.any(Object),
      );
    });

    it('should invalidate old tokens and create new for existing pending user', async () => {
      const pendingUser = {
        id: '00000000-0000-4000-8000-000000000014',
        email: 'pending@test.com',
        status: 'pendiente',
        persona: { nombreCompleto: 'Pending User' },
      };
      mockUsuarios.findByEmailOrPhone.mockImplementation((value: string) => {
        if (value === 'pending@test.com') return Promise.resolve(pendingUser);
        return Promise.resolve(null);
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'pending@test.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Test User')
        .field('telefono', '15512345678')
        .field('calle', 'Calle Test')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usuarioId: pendingUser.id,
            usedAt: null,
          }),
        }),
      );
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalled();
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-verification',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should enqueue account-exists email for existing active user', async () => {
      mockUsuarios.findByEmailOrPhone.mockImplementation((value: string) => {
        if (value === 'active@test.com') {
          return Promise.resolve({
            id: '00000000-0000-4000-8000-000000000001',
            email: 'active@test.com',
            status: 'activo',
          });
        }
        return Promise.resolve(null);
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'active@test.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Test User')
        .field('telefono', '15512345678')
        .field('calle', 'Calle Test')
        .field('sucursalId', '00000000-0000-4000-8000-000000000001')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-account-exists',
        expect.objectContaining({ to: 'active@test.com' }),
        expect.any(Object),
      );
    });
  });

  describe('GET /auth/verify', () => {
    it('should activate user with valid token', async () => {
      mockPrisma.emailVerificationToken.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000020',
        token: 'valid-token-123',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        usedAt: new Date(),
        usuarioId: '00000000-0000-4000-8000-000000000014',
      });

      const response = await request(app.getHttpServer()).get(
        '/auth/verify?token=valid-token-123',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Tu cuenta ha sido activada exitosamente.',
      });
      expect(mockPrisma.emailVerificationToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            token: 'valid-token-123',
            usedAt: null,
          }),
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
      expect(mockPrisma.usuario.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '00000000-0000-4000-8000-000000000014' },
          data: { status: 'activo' },
        }),
      );
    });

    it('should redirect to success URL when configured', async () => {
      const successUrl = 'https://vetec.app/confirmacion-exito';
      const mockConfigService = {
        get: jest.fn((key: keyof Env) => {
          if (key === 'FRONTEND_CONFIRMATION_SUCCESS_URL') return successUrl;
          return undefined;
        }),
      };

      mockPrisma.emailVerificationToken.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000020',
        token: 'valid-token-123',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        usedAt: new Date(),
        usuarioId: '00000000-0000-4000-8000-000000000014',
      });

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrisma)
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      const response = await request(testApp.getHttpServer()).get(
        '/auth/verify?token=valid-token-123',
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(successUrl);

      await testApp.close();
    });

    it('should return 400 for invalid/expired/used token (atomic rejection)', async () => {
      mockPrisma.emailVerificationToken.updateMany.mockResolvedValue({
        count: 0,
      });

      const response = await request(app.getHttpServer()).get(
        '/auth/verify?token=invalid-token',
      );

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
          message:
            'El enlace de verificación es inválido, ha expirado o ya fue utilizado.',
        }),
      );
    });

    it('should redirect to error URL when configured and token is invalid', async () => {
      const errorUrl = 'https://vetec.app/confirmacion-error';
      const mockConfigService = {
        get: jest.fn((key: keyof Env) => {
          if (key === 'FRONTEND_CONFIRMATION_ERROR_URL') return errorUrl;
          if (key === 'FRONTEND_CONFIRMATION_SUCCESS_URL') return undefined;
          return undefined;
        }),
      };

      mockPrisma.emailVerificationToken.updateMany.mockResolvedValue({
        count: 0,
      });

      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(PrismaService)
        .useValue(mockPrisma)
        .overrideProvider(ConfigService)
        .useValue(mockConfigService)
        .compile();

      const testApp = moduleFixture.createNestApplication();
      await testApp.init();

      const response = await request(testApp.getHttpServer()).get(
        '/auth/verify?token=invalid-token',
      );

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(errorUrl);

      await testApp.close();
    });
  });

  describe('POST /auth/resend-confirmation', () => {
    it('should delete old tokens and create new for pending user', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000014',
        email: 'pending@test.com',
        status: 'pendiente',
        persona: { nombreCompleto: 'Pending User' },
      });

      const response = await request(app.getHttpServer())
        .post('/auth/resend-confirmation')
        .send({ email: 'pending@test.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockPrisma.emailVerificationToken.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            usuarioId: '00000000-0000-4000-8000-000000000014',
            usedAt: null,
          }),
        }),
      );
      expect(mockPrisma.emailVerificationToken.create).toHaveBeenCalled();
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-verification',
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should return generic message for non-existent email', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/resend-confirmation')
        .send({ email: 'nonexistent@test.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(
        mockPrisma.emailVerificationToken.deleteMany,
      ).not.toHaveBeenCalled();
      expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
    });

    it('should return generic message for active user', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'active@test.com',
        status: 'activo',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/resend-confirmation')
        .send({ email: 'active@test.com' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(
        mockPrisma.emailVerificationToken.deleteMany,
      ).not.toHaveBeenCalled();
      expect(mockPrisma.emailVerificationToken.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/resend-confirmation')
        .send({ email: 'not-an-email' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 400,
          error: 'Bad Request',
        }),
      );
    });
  });

  describe('Login after verification', () => {
    it('should allow login after user is activated', async () => {
      mockPrisma.emailVerificationToken.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrisma.emailVerificationToken.findUnique.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000020',
        token: 'valid-token-123',
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        usedAt: new Date(),
        usuarioId: '00000000-0000-4000-8000-000000000014',
      });

      // Verify the email
      const verifyResponse = await request(app.getHttpServer()).get(
        '/auth/verify?token=valid-token-123',
      );
      expect(verifyResponse.status).toBe(200);

      // Now mock login to return active user
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000014',
        email: 'verified@test.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: '00000000-0000-4000-8000-000000000014',
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'verified@test.com',
          password: 'Password123',
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('accessToken');
      expect(loginResponse.body).toHaveProperty('user');
    });

    it('should reject login for pending user', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000014',
        email: 'pending@test.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'pendiente',
        personaId: '00000000-0000-4000-8000-000000000014',
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'pending@test.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 401,
          message: 'Credenciales inválidas. Inténtalo de nuevo.',
        }),
      );
    });
  });
});
