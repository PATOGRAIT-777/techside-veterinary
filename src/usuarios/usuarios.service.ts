import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, Usuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Env } from '../config/env.validation';
import { BuscarUsuariosQueryDto } from './dto/buscar-usuarios-query.dto';
import { UsuarioResumenDto } from './dto/usuario-resumen.dto';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async findByEmailOrPhone(emailOrPhone: string): Promise<
    | (Usuario & {
        persona: {
          id: string;
          nombreCompleto: string;
          telefono: string;
          sucursalId: string;
        };
      })
    | null
  > {
    const isEmail = emailOrPhone.includes('@');

    if (isEmail) {
      return this.prisma.usuario.findUnique({
        where: { email: emailOrPhone.toLowerCase() },
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
    }

    return this.prisma.usuario.findUnique({
      where: { telefono: emailOrPhone },
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
  }

  async hashPassword(password: string): Promise<string> {
    const rounds = this.configService.get('BCRYPT_ROUNDS', { infer: true });
    return bcrypt.hash(password, rounds);
  }

  async createUser(data: Prisma.UsuarioCreateInput): Promise<Usuario> {
    const hashedPassword = await this.hashPassword(data.passwordHash);
    return this.prisma.usuario.create({
      data: {
        ...data,
        passwordHash: hashedPassword,
      },
    });
  }

  async search(
    query: BuscarUsuariosQueryDto,
  ): Promise<{ data: UsuarioResumenDto[]; total: number }> {
    const { search, rol, limit, offset } = query;

    const where: Prisma.UsuarioWhereInput = {};

    if (rol) {
      where.rol = rol;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } },
        {
          persona: {
            nombreCompleto: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const skip = Math.max(offset ?? 0, 0);

    const [data, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          telefono: true,
          persona: { select: { nombreCompleto: true } },
        },
        orderBy: { persona: { nombreCompleto: 'asc' } },
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: data.map((u) => ({
        id: u.id,
        email: u.email,
        telefono: u.telefono,
        nombreCompleto: u.persona.nombreCompleto,
      })),
      total,
    };
  }
}
