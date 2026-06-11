import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Rol } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  buscarUsuariosQuerySchema,
  type BuscarUsuariosQueryDto,
} from './dto/buscar-usuarios-query.dto';
import { UsuarioResumenDto } from './dto/usuario-resumen.dto';
import {
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '../common/swagger/error-responses';

@ApiTags('Usuarios')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.medico, Rol.admin)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({ summary: 'Buscar usuarios' })
  @ApiQuery({
    name: 'search',
    type: 'string',
    required: false,
    description: 'Búsqueda por nombre, email o teléfono (máx 100 caracteres)',
  })
  @ApiQuery({
    name: 'rol',
    type: 'string',
    enum: ['cliente', 'medico', 'admin'],
    required: false,
    description: 'Filtrar por rol',
  })
  @ApiQuery({
    name: 'limit',
    type: 'integer',
    required: false,
    description: 'Cantidad de resultados (default 20, max 100)',
  })
  @ApiQuery({
    name: 'offset',
    type: 'integer',
    required: false,
    description: 'Desplazamiento para paginación (default 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de usuarios',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              telefono: { type: 'string' },
              nombreCompleto: { type: 'string' },
            },
          },
        },
        total: { type: 'integer' },
      },
    },
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Get()
  async search(
    @Query(new ZodValidationPipe(buscarUsuariosQuerySchema))
    query: BuscarUsuariosQueryDto,
  ): Promise<{ data: UsuarioResumenDto[]; total: number }> {
    return this.usuariosService.search(query);
  }
}
