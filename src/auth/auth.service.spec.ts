import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { Readable } from 'stream';
import { AuthService } from './auth.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PersonasService } from '../personas/personas.service';
import { ArchivosService } from '../archivos/archivos.service';
import { EmailService } from '../email/email.service';
import { MxDivisionesService } from '../mx-divisiones/mx-divisiones.service';
import { PrismaService } from '../prisma/prisma.service';
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

  const mockPersonasService = {
    create: jest.fn(),
  };

  const mockArchivosService = {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockEmailService = {
    send: jest.fn(),
    getSentMessages: jest.fn().mockReturnValue([]),
    clear: jest.fn(),
  };

  const mockMxDivisionesService = {
    findById: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    persona: {
      create: jest.fn(),
    },
    usuario: {
      create: jest.fn(),
    },
    archivo: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: mockUsuariosService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PersonasService, useValue: mockPersonasService },
        { provide: ArchivosService, useValue: mockArchivosService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: MxDivisionesService, useValue: mockMxDivisionesService },
        { provide: PrismaService, useValue: mockPrismaService },
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
        id: 1,
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: 1,
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
        sub: 1,
        email: 'test@example.com',
        rol: 'cliente',
      });
      expect(result).toEqual({
        accessToken: 'mock-token',
        user: {
          id: 1,
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
        id: 1,
        email: 'inactive@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'inactivo',
        personaId: 1,
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
        id: 1,
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'hashed',
        rol: 'cliente',
        status: 'activo',
        personaId: 1,
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
      sucursalId: 1,
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

    it('should return generic 201 for duplicate email', async () => {
      mockUsuariosService.findByEmailOrPhone.mockImplementation(
        (value: string) => {
          if (value === 'new@example.com') {
            return Promise.resolve({ id: 1, email: 'new@example.com' });
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
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'new@example.com',
        'Cuenta existente',
        'Ya tienes una cuenta. Inicia Sesión',
      );
      expect(mockArchivosService.saveFile).not.toHaveBeenCalled();
    });

    it('should return generic 201 for duplicate phone', async () => {
      mockUsuariosService.findByEmailOrPhone.mockImplementation(
        (value: string) => {
          if (value === '5215512345678') {
            return Promise.resolve({ id: 1, telefono: '5215512345678' });
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
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'new@example.com',
        'Cuenta existente',
        'Ya tienes una cuenta. Inicia Sesión',
      );
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

    it('should register new user and send activation email', async () => {
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(null);
      mockMxDivisionesService.findById.mockResolvedValue({
        id: 1,
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

      mockPrismaService.persona.create.mockResolvedValue({ id: 10 });
      mockPrismaService.usuario.create.mockResolvedValue({ id: 20 });
      mockPrismaService.archivo.create.mockResolvedValue({ id: 30 });

      const result = await service.register(validDto, {
        addressDoc: mockAddressDoc,
        identityDoc: mockIdentityDoc,
      });

      expect(result).toEqual({
        message: 'Te enviamos un correo para continuar...',
      });
      expect(mockArchivosService.saveFile).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockEmailService.send).toHaveBeenCalledWith(
        'new@example.com',
        'Activa tu cuenta',
        'Haz clic aquí para activar tu cuenta',
      );
    });

    it('should rollback files on transaction failure', async () => {
      mockUsuariosService.findByEmailOrPhone.mockResolvedValue(null);
      mockMxDivisionesService.findById.mockResolvedValue({
        id: 1,
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
        id: 1,
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
