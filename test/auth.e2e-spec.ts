import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Controller, Get, UseGuards } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { Roles } from '../src/common/decorators/roles.decorator';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ArchivosService } from '../src/archivos/archivos.service';
import { UsuariosService } from '../src/usuarios/usuarios.service';

interface LoginResponseBody {
  accessToken: string;
  user: { id: number; email: string; rol: string };
}

jest.mock('bcrypt', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue('hashed-password'),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

@Controller('test')
class TestAdminController {
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  adminOnly() {
    return { message: 'Admin access granted' };
  }

  @Get('authenticated')
  @UseGuards(JwtAuthGuard)
  authenticated() {
    return { message: 'Authenticated access granted' };
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let mockPrisma: unknown;
  let mockArchivos: Record<string, jest.Mock>;
  let mockUsuarios: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((cb: (prisma: typeof mockPrisma) => unknown) =>
        cb(mockPrisma),
      ),
      $disconnect: jest.fn(),
      mxDivision: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, activo: true }),
      },
      persona: {
        create: jest.fn().mockResolvedValue({ id: 10 }),
      },
      usuario: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 20 }),
      },
      archivo: {
        create: jest.fn().mockResolvedValue({ id: 30 }),
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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestAdminController],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(ArchivosService)
      .useValue(mockArchivos)
      .overrideProvider(UsuariosService)
      .useValue(mockUsuarios)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new cliente without auth and return 201', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'cliente@test.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Test Cliente')
        .field('telefono', '15512345678')
        .field('calle', 'Calle Test')
        .field('sucursalId', '1')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
    });

    it('should return 201 generic message for duplicate email', async () => {
      mockUsuarios.findByEmailOrPhone.mockImplementation((value: string) => {
        if (value === 'duplicate@test.com') {
          return Promise.resolve({
            id: 1,
            email: 'duplicate@test.com',
          });
        }
        return Promise.resolve(null);
      });

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'duplicate@test.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Test')
        .field('telefono', '15512345678')
        .field('calle', 'Calle')
        .field('sucursalId', '1')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
    });

    it('should return 400 for invalid file type', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'new@test.com')
        .field('password', 'Password123')
        .field('rol', 'cliente')
        .field('nombreCompleto', 'Test')
        .field('telefono', '15512345678')
        .field('calle', 'Calle')
        .field('sucursalId', '1')
        .attach('addressDoc', Buffer.from('exe'), 'virus.exe')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .field('email', 'not-an-email')
        .field('password', 'short')
        .attach('addressDoc', Buffer.from('pdf'), 'direccion.pdf')
        .attach('identityDoc', Buffer.from('jpg'), 'identidad.jpg');

      expect(response.status).toBe(400);
      expect((response.body as { details: unknown[] }).details).toBeDefined();
    });
  });

  describe('POST /auth/login', () => {
    it('should return 200 with accessToken for valid credentials', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: 1,
      });

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(200);
      const body = response.body as LoginResponseBody;
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('user');
      expect(body.user).toEqual(
        expect.objectContaining({
          id: 1,
          email: 'test@example.com',
          rol: 'cliente',
        }),
      );
    });

    it('should return 401 for invalid credentials', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'wrong@example.com',
          password: 'WrongPassword',
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

  describe('JWT protected endpoints', () => {
    it('should allow access with valid JWT', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: 1,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'test@example.com',
          password: 'Password123',
        });

      const token = (loginResponse.body as LoginResponseBody).accessToken;

      const response = await request(app.getHttpServer())
        .get('/test/authenticated')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Authenticated access granted',
      });
    });

    it('should return 401 without JWT', async () => {
      const response = await request(app.getHttpServer()).get(
        '/test/authenticated',
      );

      expect(response.status).toBe(401);
    });

    it('should return 403 when cliente accesses admin endpoint', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: 1,
        email: 'cliente@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: 1,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'cliente@example.com',
          password: 'Password123',
        });

      const token = (loginResponse.body as LoginResponseBody).accessToken;

      const response = await request(app.getHttpServer())
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 403,
          message: 'No tienes permiso para realizar esta acción.',
        }),
      );
    });

    it('should allow admin to access admin endpoint', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue({
        id: 1,
        email: 'admin@example.com',
        telefono: '55500000000',
        passwordHash: 'hashed',
        rol: 'admin',
        status: 'activo',
        personaId: 1,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'admin@example.com',
          password: 'Password123',
        });

      const token = (loginResponse.body as LoginResponseBody).accessToken;

      const response = await request(app.getHttpServer())
        .get('/test/admin-only')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Admin access granted',
      });
    });
  });

  describe('Rate limiting', () => {
    it('should return 429 after 5 rapid login requests', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue(null);

      // Make 5 rapid requests (all should get 401 — credential errors)
      for (let i = 0; i < 5; i++) {
        const res = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            emailOrPhone: 'test@test.com',
            password: 'WrongPass123',
          });
        expect(res.status).toBe(401);
      }

      // 6th request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'test@test.com',
          password: 'WrongPass123',
        });

      expect(response.status).toBe(429);
    });
  });

  describe('Error response shape', () => {
    it('should return standardized error for 400 with details', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ emailOrPhone: 'test@example.com' });

      expect(response.status).toBe(400);
      const body = response.body as {
        statusCode: number;
        message: string;
        error: string;
        details: unknown[];
      };
      expect(body.statusCode).toBe(400);
      expect(body.error).toBe('Bad Request');
      expect(body.details).toBeDefined();
    });

    it('should return standardized error for 401 without details', async () => {
      mockUsuarios.findByEmailOrPhone.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          emailOrPhone: 'test@example.com',
          password: 'Password123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 401,
          message: 'Credenciales inválidas. Inténtalo de nuevo.',
          error: 'Unauthorized',
        }),
      );
      const body = response.body as {
        statusCode: number;
        message: string;
        error: string;
        details?: unknown[];
      };
      expect(body.statusCode).toBe(401);
      expect(body.message).toBe('Credenciales inválidas. Inténtalo de nuevo.');
      expect(body.error).toBe('Unauthorized');
      expect(body).not.toHaveProperty('details');
    });
  });
});
