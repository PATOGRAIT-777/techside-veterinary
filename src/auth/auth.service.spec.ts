import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
// @nestjs/bull not installed yet (PR-2a); use Bull's internal token string
const BULL_QUEUE_TOKEN = 'BullQueue_email-queue';
import { Readable } from 'stream';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ArchivosService } from '../archivos/archivos.service';
import { MxDivisionesService } from '../mx-divisiones/mx-divisiones.service';
import { PrismaService } from '../prisma/prisma.service';
import { MedicosService } from '../medicos/medicos.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsuariosService = {
    findByEmailOrPhone: jest.fn(),
    hashPassword: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
  };

  const mockArchivosService = {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockMxDivisionesService = {
    findById: jest.fn(),
  };

  const mockMedicosService = {
    registrarEntradaAutomatica: jest.fn(),
  };

  const mockEmailQueue = {
    add: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    persona: {
      create: jest.fn(),
      update: jest.fn(),
    },
    usuario: {
      create: jest.fn(),
    },
    archivo: {
      create: jest.fn(),
    },
    medico: {
      findFirst: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: mockUsuariosService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ArchivosService, useValue: mockArchivosService },
        { provide: MxDivisionesService, useValue: mockMxDivisionesService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MedicosService, useValue: mockMedicosService },
        { provide: BULL_QUEUE_TOKEN, useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return accessToken and user for valid credentials', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: '00000000-0000-4000-8000-000000000001',
      };
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        emailOrPhone: 'test@example.com',
        password: 'Password123',
      });

      expect(mockUsuariosService.findByEmailOrPhone).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
        rol: 'cliente',
      });
      expect(result).toEqual({
        accessToken: 'mock-token',
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'test@example.com',
          rol: 'cliente',
        },
      });
    });

    it('should throw 401 for non-existent user without bcrypt compare', async () => {
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(null);

      await expect(
        service.login({
          emailOrPhone: 'nonexistent@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Credenciales inválidas. Inténtalo de nuevo.',
        ),
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw 401 for inactive user without bcrypt compare', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'inactive@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'inactivo',
        personaId: '00000000-0000-4000-8000-000000000001',
      };
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(mockUser);

      await expect(
        service.login({
          emailOrPhone: 'inactive@example.com',
          password: 'Password123',
        }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Credenciales inválidas. Inténtalo de nuevo.',
        ),
      );
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw 401 for wrong password', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: '00000000-0000-4000-8000-000000000001',
      };
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          emailOrPhone: 'test@example.com',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Credenciales inválidas. Inténtalo de nuevo.',
        ),
      );
      expect(bcrypt.compare).toHaveBeenCalledWith('WrongPassword', 'hashed');
    });

    it('should call registrarEntradaAutomatica for medico login', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'medico@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'medico',
        status: 'activo',
        personaId: '00000000-0000-4000-8000-000000000001',
      };
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.medico.findFirst.mockResolvedValue({
        id: 'med-1',
        usuarioId: mockUser.id,
      });

      const result = await service.login({
        emailOrPhone: 'medico@example.com',
        password: 'Password123',
      });

      expect(result.user.rol).toBe('medico');
      expect(mockPrismaService.medico.findFirst).toHaveBeenCalledWith({
        where: { usuarioId: mockUser.id },
      });
      expect(
        mockMedicosService.registrarEntradaAutomatica,
      ).toHaveBeenCalledWith('med-1');
    });

    it('should not call registrarEntradaAutomatica for cliente login', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'cliente@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: '00000000-0000-4000-8000-000000000001',
      };
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        emailOrPhone: 'cliente@example.com',
        password: 'Password123',
      });

      expect(result.user.rol).toBe('cliente');
      expect(
        mockMedicosService.registrarEntradaAutomatica,
      ).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const validDto = {
      email: 'new@example.com',
      password: 'Password123',
      rol: 'cliente' as const,
      nombreCompleto: 'Juan Pérez',
      telefono: '5215512345678',
      telefonoSecundario: undefined,
      calle: 'Av. Principal 100',
      numExterior: undefined,
      numInterior: undefined,
      sucursalId: '00000000-0000-4000-8000-000000000001',
    };

    const mockAddressDoc: Express.Multer.File = {
      fieldname: 'addressDoc',
      originalname: 'direccion.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('pdf'),

      stream: undefined as unknown as Readable,
      destination: '',
      filename: '',
      path: '',
    };

    const mockIdentityDoc: Express.Multer.File = {
      fieldname: 'identityDoc',
      originalname: 'identidad.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 2048,
      buffer: Buffer.from('jpg'),

      stream: undefined as unknown as Readable,
      destination: '',
      filename: '',
      path: '',
    };

    it('should enqueue account-exists email for duplicate active email', async () => {
      mockUsuariosService.findByEmailOrPhone.mockImplementation(
        (value: string) => {
          if (value === 'new@example.com') {
            return Promise.resolve({
              id: '00000000-0000-4000-8000-000000000001',
              email: 'new@example.com',
              status: 'activo',
            });
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.register(validDto, {
        addressDoc: mockAddressDoc,
        identityDoc: mockIdentityDoc,
      });

      expect(result).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-account-exists',
        { to: 'new@example.com' },
        expect.any(Object),
      );
      expect(
        mockPrismaService.emailVerificationToken.create,
      ).not.toHaveBeenCalled();
      expect(mockArchivosService.saveFile).not.toHaveBeenCalled();
    });

    it('should enqueue account-exists email for duplicate active phone', async () => {
      mockUsuariosService.findByEmailOrPhone.mockImplementation(
        (value: string) => {
          if (value === '5215512345678') {
            return Promise.resolve({
              id: '00000000-0000-4000-8000-000000000001',
              telefono: '5215512345678',
              status: 'activo',
            });
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.register(validDto, {
        addressDoc: mockAddressDoc,
        identityDoc: mockIdentityDoc,
      });

      expect(result).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-account-exists',
        { to: 'new@example.com' },
        expect.any(Object),
      );
    });

    it('should resend verification for duplicate pending user', async () => {
      mockUsuariosService.findByEmailOrPhone.mockImplementation(
        (value: string) => {
          if (value === 'new@example.com') {
            return Promise.resolve({
              id: '00000000-0000-4000-8000-000000000001',
              email: 'new@example.com',
              status: 'pendiente',
              persona: {
                nombreCompleto: 'Juan Pérez',
              },
            });
          }
          return Promise.resolve(null);
        },
      );

      const result = await service.register(validDto, {
        addressDoc: mockAddressDoc,
        identityDoc: mockIdentityDoc,
      });

      expect(result).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(
        mockPrismaService.emailVerificationToken.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          usuarioId: '00000000-0000-4000-8000-000000000001',
          usedAt: null,
        },
      });
      expect(
        mockPrismaService.emailVerificationToken.create,
      ).toHaveBeenCalled();
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-verification',
        expect.objectContaining({
          to: 'new@example.com',
          userName: 'Juan Pérez',
        }),
        expect.any(Object),
      );
      expect(mockArchivosService.saveFile).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid sucursalId', async () => {
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(null);
      mockMxDivisionesService.findById.mockRejectedValue(
        new BadRequestException('Sucursal no encontrada'),
      );

      await expect(
        service.register(validDto, {
          addressDoc: mockAddressDoc,
          identityDoc: mockIdentityDoc,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should register new user and enqueue verification email', async () => {
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(null);
      mockMxDivisionesService.findById.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        activo: true,
      });
      mockArchivosService.saveFile
        .mockReturnValueOnce('./uploads/address-uuid.pdf')
        .mockReturnValueOnce('./uploads/identity-uuid.jpg');
      mockUsuariosService.hashPassword.mockResolvedValue('hashed-pass');

      mockPrismaService.$transaction.mockImplementation((callback: any) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
        return callback(mockPrismaService);
      });

      mockPrismaService.persona.create.mockResolvedValue({
        id: '00000000-0000-4000-8000-00000000000a',
        nombreCompleto: 'Juan Pérez',
      });
      mockPrismaService.usuario.create.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000014',
      });
      mockPrismaService.archivo.create
        .mockResolvedValueOnce({
          id: '00000000-0000-4000-8000-00000000001e',
        })
        .mockResolvedValueOnce({
          id: '00000000-0000-4000-8000-00000000001f',
        });
      mockPrismaService.persona.update.mockResolvedValue({});

      const result = await service.register(validDto, {
        addressDoc: mockAddressDoc,
        identityDoc: mockIdentityDoc,
      });

      expect(result).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockArchivosService.saveFile).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(
        mockPrismaService.emailVerificationToken.create,
      ).toHaveBeenCalled();
      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'send-verification',
        expect.objectContaining({
          to: 'new@example.com',
          userName: 'Juan Pérez',
        }),
        expect.any(Object),
      );
    });

    it('should rollback files on transaction failure', async () => {
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(null);
      mockMxDivisionesService.findById.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        activo: true,
      });
      mockArchivosService.saveFile
        .mockReturnValueOnce('./uploads/address-uuid.pdf')
        .mockReturnValueOnce('./uploads/identity-uuid.jpg');

      mockPrismaService.$transaction.mockRejectedValue(new Error('DB error'));

      await expect(
        service.register(validDto, {
          addressDoc: mockAddressDoc,
          identityDoc: mockIdentityDoc,
        }),
      ).rejects.toThrow('DB error');

      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/address-uuid.pdf',
      );
      expect(mockArchivosService.deleteFile).toHaveBeenCalledWith(
        './uploads/identity-uuid.jpg',
      );
    });

    it('should throw BadRequestException when files are missing', async () => {
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(null);
      mockMxDivisionesService.findById.mockResolvedValue({
        id: '00000000-0000-4000-8000-000000000001',
        activo: true,
      });

      await expect(service.register(validDto, {})).rejects.toThrow(
        new BadRequestException(
          'Se requieren ambos documentos: validación de dirección e identidad',
        ),
      );
    });
  });
});
