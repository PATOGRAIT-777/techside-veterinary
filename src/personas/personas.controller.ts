import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PersonasService } from './personas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '../common/swagger/error-responses';

@ApiTags('Personas')
@Controller('personas')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description:
      'Devuelve el perfil completo del usuario logueado, incluyendo datos de Persona, sucursal enriquecida y, si aplica, datos del médico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil completo del usuario autenticado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        telefono: { type: 'string' },
        rol: {
          type: 'string',
          enum: ['cliente', 'medico', 'admin'],
        },
        personaId: { type: 'string', format: 'uuid' },
        nombreCompleto: { type: 'string' },
        telefonoSecundario: { type: 'string', nullable: true },
        calle: { type: 'string' },
        numExterior: { type: 'string', nullable: true },
        numInterior: { type: 'string', nullable: true },
        sucursal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
          },
        },
        medico: {
          type: 'object',
          nullable: true,
          properties: {
            cedulaProfesional: { type: 'string', nullable: true },
            especialidadPrincipal: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            sucursal: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            horarios: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  diaSemana: { type: 'string' },
                  horaInicio: {
                    type: 'string',
                    format: 'date-time',
                  },
                  horaFin: { type: 'string', format: 'date-time' },
                  consultorio: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      nombre: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  async getMe(@CurrentUser('sub') usuarioId: string) {
    return this.personasService.findByUsuarioId(usuarioId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Actualizar datos personales del usuario autenticado',
    description:
      'Permite actualizar parcialmente los datos personales del usuario. No se permite modificar email, teléfono principal, sucursal, rol ni contraseña.',
  })
  @ApiBody({
    description: 'Campos personales editables (al menos uno requerido)',
    schema: {
      type: 'object',
      properties: {
        nombreCompleto: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
        },
        telefonoSecundario: {
          type: 'string',
          maxLength: 15,
          nullable: true,
        },
        calle: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
        },
        numExterior: {
          type: 'string',
          maxLength: 20,
          nullable: true,
        },
        numInterior: {
          type: 'string',
          maxLength: 20,
          nullable: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        telefono: { type: 'string' },
        rol: {
          type: 'string',
          enum: ['cliente', 'medico', 'admin'],
        },
        personaId: { type: 'string', format: 'uuid' },
        nombreCompleto: { type: 'string' },
        telefonoSecundario: { type: 'string', nullable: true },
        calle: { type: 'string' },
        numExterior: { type: 'string', nullable: true },
        numInterior: { type: 'string', nullable: true },
        sucursal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nombre: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  async patchMe(
    @CurrentUser('sub') usuarioId: string,
    @Body(new ZodValidationPipe(UpdatePersonaDto)) dto: UpdatePersonaDto,
  ) {
    return this.personasService.updateForUsuario(usuarioId, dto);
  }
}
