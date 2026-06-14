/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import request from 'supertest';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Rol } from '@prisma/client';
import type { ProfileResponse } from './personas.service';

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  error: string;
  details?: Array<{ path: (string | number)[]; message: string }>;
}

describe('PersonasController', () => {
  let app: INestApplication;

  const mockProfile: ProfileResponse = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'juan@vetec.local',
    telefono: '55511111111',
    rol: Rol.cliente,
    personaId: '00000000-0000-4000-8000-00000000000a',
    nombreCompleto: 'Juan Pérez',
    telefonoSecundario: '+525555555556',
    calle: 'Av. Reforma',
    numExterior: '123',
    numInterior: 'A',
    sucursal: {
      id: '00000000-0000-4000-8000-000000000010',
      nombre: 'Vetec Centro',
    },
  };

  const mockMedicoProfile: ProfileResponse = {
    ...mockProfile,
    rol: Rol.medico,
    email: 'carlos@vetec.local',
    nombreCompleto: 'Dr. Carlos Ruiz',
    medico: {
      cedulaProfesional: 'CED-123456',
      especialidadPrincipal: {
        id: '00000000-0000-4000-8000-000000000020',
        nombre: 'Cirugía General',
      },
      sucursal: {
        id: '00000000-0000-4000-8000-000000000010',
        nombre: 'Vetec Centro',
      },
      horarios: [
        {
          id: '00000000-0000-4000-8000-000000000030',
          diaSemana: 'lunes',
          horaInicio: '1970-01-01T09:00:00.000Z',
          horaFin: '1970-01-01T14:00:00.000Z',
          consultorio: {
            id: '00000000-0000-4000-8000-000000000040',
            nombre: 'Consultorio 1',
          },
        },
      ],
    },
  };

  const mockService = {
    findByUsuarioId: jest.fn(),
    updateForUsuario: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonasController],
      providers: [{ provide: PersonasService, useValue: mockService }],
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
              rol: Rol.cliente,
            };
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

  describe('GET /personas/me', () => {
    it('should return 200 with enriched profile for cliente', async () => {
      mockService.findByUsuarioId.mockResolvedValue(mockProfile);

      const response = await request(app.getHttpServer())
        .get('/personas/me')
        .expect(200);

      expect(response.body).toEqual(mockProfile);
      expect(mockService.findByUsuarioId).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000001',
      );
    });

    it('should return 200 with médico enrichment when rol is medico', async () => {
      mockService.findByUsuarioId.mockResolvedValue(mockMedicoProfile);

      const response = await request(app.getHttpServer())
        .get('/personas/me')
        .expect(200);

      expect(response.body).toEqual(mockMedicoProfile);
      const body = response.body as ProfileResponse;
      expect(body.medico).toBeDefined();
      expect(body.medico?.especialidadPrincipal?.nombre).toBe(
        'Cirugía General',
      );
    });

    it('should return 401 without JWT', async () => {
      const failModule: TestingModule = await Test.createTestingModule({
        controllers: [PersonasController],
        providers: [{ provide: PersonasService, useValue: mockService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({
          canActivate: () => {
            throw new UnauthorizedException();
          },
        })
        .compile();

      const failApp = failModule.createNestApplication();
      await failApp.init();

      await request(failApp.getHttpServer()).get('/personas/me').expect(401);

      await failApp.close();
    });
  });

  describe('PATCH /personas/me', () => {
    it('should return 200 with updated profile', async () => {
      const updatedProfile: ProfileResponse = {
        ...mockProfile,
        nombreCompleto: 'Juan Pérez López',
        calle: 'Av. Reforma Norte',
      };
      mockService.updateForUsuario.mockResolvedValue(updatedProfile);

      const response = await request(app.getHttpServer())
        .patch('/personas/me')
        .send({
          nombreCompleto: 'Juan Pérez López',
          calle: 'Av. Reforma Norte',
        })
        .expect(200);

      expect(response.body).toEqual(updatedProfile);
      expect(mockService.updateForUsuario).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000001',
        expect.objectContaining({
          nombreCompleto: 'Juan Pérez López',
          calle: 'Av. Reforma Norte',
        }),
      );
    });

    it('should return 400 when body is empty', async () => {
      const response = await request(app.getHttpServer())
        .patch('/personas/me')
        .send({})
        .expect(400);

      const body = response.body as ErrorResponseBody;
      expect(body.statusCode).toBe(400);
      expect(body.details).toBeDefined();
    });

    it('should return 400 when a forbidden field is present', async () => {
      const response = await request(app.getHttpServer())
        .patch('/personas/me')
        .send({ email: 'nuevo@vetec.local' })
        .expect(400);

      const body = response.body as ErrorResponseBody;
      expect(body.statusCode).toBe(400);
      expect(body.details).toBeDefined();
    });

    it('should return 400 when nombreCompleto exceeds max length', async () => {
      const response = await request(app.getHttpServer())
        .patch('/personas/me')
        .send({ nombreCompleto: 'a'.repeat(201) })
        .expect(400);

      const body = response.body as ErrorResponseBody;
      expect(body.statusCode).toBe(400);
      expect(body.details).toBeDefined();
    });
  });
});
