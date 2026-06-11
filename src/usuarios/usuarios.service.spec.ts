import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UsuariosService } from './usuarios.service';
import { PrismaService } from '../prisma/prisma.service';
import { BuscarUsuariosQueryDto } from './dto/buscar-usuarios-query.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsuariosService', () => {
  let service: UsuariosService;

  const mockPrisma = {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(12),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmailOrPhone', () => {
    it('should find user by email (case-insensitive match by lowercasing)', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'hash',
        rol: 'cliente',
        status: 'activo',
        personaId: '00000000-0000-4000-8000-000000000001',
        persona: {
          id: '00000000-0000-4000-8000-000000000001',
          nombreCompleto: 'Test',
          telefono: '55512345678',
          sucursalId: '00000000-0000-4000-8000-000000000001',
        },
      };
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmailOrPhone('Test@Example.COM');

      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          persona: {
            select: {
              id: true,
              nombreCompleto: true,
              telefono: true,
              sucursalId: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should find user by phone', async () => {
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'other@example.com',
        telefono: '55598765432',
        passwordHash: 'hash',
        rol: 'medico',
        status: 'activo',
        personaId: '00000000-0000-4000-8000-000000000002',
        persona: {
          id: '00000000-0000-4000-8000-000000000002',
          nombreCompleto: 'Other',
          telefono: '55598765432',
          sucursalId: '00000000-0000-4000-8000-000000000001',
        },
      };
      mockPrisma.usuario.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmailOrPhone('55598765432');

      expect(mockPrisma.usuario.findUnique).toHaveBeenCalledWith({
        where: { telefono: '55598765432' },
        include: {
          persona: {
            select: {
              id: true,
              nombreCompleto: true,
              telefono: true,
              sucursalId: true,
            },
          },
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrisma.usuario.findUnique.mockResolvedValue(null);

      const result = await service.findByEmailOrPhone(
        'nonexistent@example.com',
      );

      expect(result).toBeNull();
    });
  });

  describe('hashPassword', () => {
    it('should hash password with bcrypt using config rounds', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');

      const result = await service.hashPassword('plainPassword');

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 12);
      expect(result).toBe('hashedPassword');
    });
  });

  describe('createUser', () => {
    it('should hash password before creating user', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      const mockUser = {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
      };
      mockPrisma.usuario.create.mockResolvedValue(mockUser);

      const result = await service.createUser({
        email: 'test@example.com',
        telefono: '55512345678',
        passwordHash: 'plainPassword',
        rol: 'cliente',
        persona: { connect: { id: '00000000-0000-4000-8000-000000000001' } },
      } as never);

      expect(bcrypt.hash).toHaveBeenCalledWith('plainPassword', 12);
      expect(mockPrisma.usuario.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          telefono: '55512345678',
          passwordHash: 'hashedPassword',
          rol: 'cliente',
          persona: { connect: { id: '00000000-0000-4000-8000-000000000001' } },
        },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('search', () => {
    const mockUsers = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        email: 'juan@example.com',
        telefono: '5551234567',
        persona: { nombreCompleto: 'Juan Pérez' },
      },
      {
        id: '00000000-0000-4000-8000-000000000002',
        email: 'ana@example.com',
        telefono: '5559876543',
        persona: { nombreCompleto: 'Ana López' },
      },
    ];

    it('should return default pagination (skip=0, take=20)', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue(mockUsers);
      mockPrisma.usuario.count.mockResolvedValue(2);

      const result = await service.search({} as BuscarUsuariosQueryDto);

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 20,
          select: {
            id: true,
            email: true,
            telefono: true,
            persona: { select: { nombreCompleto: true } },
          },
          orderBy: { persona: { nombreCompleto: 'asc' } },
        }),
      );
      expect(mockPrisma.usuario.count).toHaveBeenCalledWith({ where: {} });
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should apply OR search across email, telefono and persona.nombreCompleto', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([mockUsers[0]]);
      mockPrisma.usuario.count.mockResolvedValue(1);

      await service.search({ search: 'Juan' } as BuscarUsuariosQueryDto);

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { email: { contains: 'Juan', mode: 'insensitive' } },
              { telefono: { contains: 'Juan', mode: 'insensitive' } },
              {
                persona: {
                  nombreCompleto: { contains: 'Juan', mode: 'insensitive' },
                },
              },
            ],
          },
        }),
      );
    });

    it('should apply rol filter alone', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([mockUsers[0]]);
      mockPrisma.usuario.count.mockResolvedValue(1);

      await service.search({ rol: 'cliente' } as BuscarUsuariosQueryDto);

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { rol: 'cliente' },
        }),
      );
      expect(mockPrisma.usuario.count).toHaveBeenCalledWith({
        where: { rol: 'cliente' },
      });
    });

    it('should combine search and rol filter', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([mockUsers[0]]);
      mockPrisma.usuario.count.mockResolvedValue(1);

      await service.search({
        search: 'Juan',
        rol: 'cliente',
      } as BuscarUsuariosQueryDto);

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            rol: 'cliente',
            OR: [
              { email: { contains: 'Juan', mode: 'insensitive' } },
              { telefono: { contains: 'Juan', mode: 'insensitive' } },
              {
                persona: {
                  nombreCompleto: { contains: 'Juan', mode: 'insensitive' },
                },
              },
            ],
          },
        }),
      );
    });

    it('should clamp limit to 100 when given 200', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);
      mockPrisma.usuario.count.mockResolvedValue(0);

      await service.search({ limit: 200 } as BuscarUsuariosQueryDto);

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });

    it('should clamp limit to 1 when given -5', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);
      mockPrisma.usuario.count.mockResolvedValue(0);

      await service.search({ limit: -5 } as BuscarUsuariosQueryDto);

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 }),
      );
    });

    it('should map results to UsuarioResumenDto and strip sensitive fields', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue(mockUsers);
      mockPrisma.usuario.count.mockResolvedValue(2);

      const result = await service.search({} as BuscarUsuariosQueryDto);

      expect(result.data[0]).toEqual({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'juan@example.com',
        telefono: '5551234567',
        nombreCompleto: 'Juan Pérez',
      });
      expect(result.data[1]).toEqual({
        id: '00000000-0000-4000-8000-000000000002',
        email: 'ana@example.com',
        telefono: '5559876543',
        nombreCompleto: 'Ana López',
      });
      expect(result.data[0]).not.toHaveProperty('passwordHash');
      expect(result.data[0]).not.toHaveProperty('status');
    });

    it('should return total from prisma.usuario.count', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);
      mockPrisma.usuario.count.mockResolvedValue(42);

      const result = await service.search({} as BuscarUsuariosQueryDto);

      expect(result.total).toBe(42);
    });

    it('should return empty data and total=0 when no matches', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);
      mockPrisma.usuario.count.mockResolvedValue(0);

      const result = await service.search({
        search: 'xyznonexistent',
      } as BuscarUsuariosQueryDto);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should use offset=0 boundary correctly', async () => {
      mockPrisma.usuario.findMany.mockResolvedValue([]);
      mockPrisma.usuario.count.mockResolvedValue(0);

      await service.search({ offset: 0 } as BuscarUsuariosQueryDto);

      expect(mockPrisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 }),
      );
    });
  });
});
