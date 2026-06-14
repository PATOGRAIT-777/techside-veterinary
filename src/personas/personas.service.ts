import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Persona, Rol } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePersonaDto } from './dto/update-persona.dto';

export interface ProfileResponse {
  id: string;
  email: string;
  telefono: string;
  rol: Rol;
  personaId: string;
  nombreCompleto: string;
  telefonoSecundario: string | null;
  calle: string;
  numExterior: string | null;
  numInterior: string | null;
  sucursal: { id: string; nombre: string };
  medico?: {
    cedulaProfesional: string | null;
    especialidadPrincipal: { id: string; nombre: string } | null;
    sucursal: { id: string; nombre: string } | null;
    horarios: Array<{
      id: string;
      diaSemana: string;
      horaInicio: string;
      horaFin: string;
      consultorio: { id: string; nombre: string };
    }>;
  } | null;
}

@Injectable()
export class PersonasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PersonaCreateInput): Promise<Persona> {
    return this.prisma.persona.create({ data });
  }

  async findByUsuarioId(usuarioId: string): Promise<ProfileResponse> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        persona: {
          include: {
            sucursal: {
              select: { id: true, nombre: true },
            },
          },
        },
        medico: {
          include: {
            sucursal: {
              select: { id: true, nombre: true },
            },
            especialidadPrincipal: {
              select: { id: true, nombre: true },
            },
            horarios: {
              include: {
                consultorio: {
                  select: { id: true, nombre: true },
                },
              },
              orderBy: [{ diaSemana: 'asc' }, { horaInicio: 'asc' }],
            },
          },
        },
      },
    });

    if (!usuario || !usuario.persona) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return this.toProfileResponse(usuario);
  }

  async updateForUsuario(
    usuarioId: string,
    dto: UpdatePersonaDto,
  ): Promise<ProfileResponse> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { personaId: true },
    });

    if (!usuario?.personaId) {
      throw new NotFoundException('Perfil no encontrado');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.persona.update({
        where: { id: usuario.personaId },
        data: dto,
      });
    });

    return this.findByUsuarioId(usuarioId);
  }

  private toProfileResponse(
    usuario: Prisma.UsuarioGetPayload<{
      include: {
        persona: {
          include: {
            sucursal: { select: { id: true; nombre: true } };
          };
        };
        medico: {
          include: {
            sucursal: { select: { id: true; nombre: true } };
            especialidadPrincipal: { select: { id: true; nombre: true } };
            horarios: {
              include: {
                consultorio: { select: { id: true; nombre: true } };
              };
            };
          };
        };
      };
    }>,
  ): ProfileResponse {
    const { persona } = usuario;

    const base: ProfileResponse = {
      id: usuario.id,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
      personaId: persona.id,
      nombreCompleto: persona.nombreCompleto,
      telefonoSecundario: persona.telefonoSecundario,
      calle: persona.calle,
      numExterior: persona.numExterior,
      numInterior: persona.numInterior,
      sucursal: persona.sucursal,
    };

    if (usuario.rol === Rol.medico) {
      base.medico = usuario.medico
        ? {
            cedulaProfesional: usuario.medico.cedulaProfesional,
            especialidadPrincipal: usuario.medico.especialidadPrincipal,
            sucursal: usuario.medico.sucursal,
            horarios: usuario.medico.horarios.map((h) => ({
              id: h.id,
              diaSemana: h.diaSemana,
              horaInicio: h.horaInicio.toISOString(),
              horaFin: h.horaFin.toISOString(),
              consultorio: h.consultorio,
            })),
          }
        : null;
    }

    return base;
  }
}
