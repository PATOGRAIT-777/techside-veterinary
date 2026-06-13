import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import { HistorialMedicoService } from './historial-medico.service';
import { adminFiltrosSchema } from './dto/admin-filtros.dto';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '../common/swagger/error-responses';

const adminMascotaResumenSchema = {
  type: 'object',
  properties: {
    mascotaId: { type: 'string', format: 'uuid' },
    mascotaNombre: { type: 'string' },
    propietarioNombre: { type: 'string' },
    propietarioEmail: { type: 'string', format: 'email' },
    ultimaCitaFecha: { type: 'string', format: 'date-time', nullable: true },
    totalCitas: { type: 'integer' },
    totalCitasCompletadas: { type: 'integer' },
  },
};

const paginatedAdminMascotasSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: adminMascotaResumenSchema },
    meta: {
      type: 'object',
      properties: {
        nextCursor: { type: 'string', nullable: true },
        limit: { type: 'integer' },
        hasMore: { type: 'boolean' },
      },
    },
  },
};

@ApiTags('Admin — Historial Mascotas')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin)
@Controller('admin/historial-mascotas')
export class AdminHistorialController {
  constructor(private readonly historialService: HistorialMedicoService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mascotas con historial (admin)' })
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'mascotaId',
    type: 'string',
    format: 'uuid',
    required: false,
    description: 'Filtrar por UUID de mascota',
  })
  @ApiQuery({
    name: 'usuarioId',
    type: 'string',
    format: 'uuid',
    required: false,
    description: 'Filtrar por UUID de propietario',
  })
  @ApiQuery({
    name: 'medicoId',
    type: 'string',
    format: 'uuid',
    required: false,
    description: 'Filtrar por UUID de médico que atendió',
  })
  @ApiQuery({
    name: 'fechaDesde',
    type: 'string',
    format: 'date',
    required: false,
    description: 'Inicio del rango de fechas (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    type: 'string',
    format: 'date',
    required: false,
    description: 'Fin del rango de fechas (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'cursor',
    type: 'string',
    required: false,
    description: 'Cursor de paginación (base64)',
  })
  @ApiQuery({
    name: 'limit',
    type: 'integer',
    required: false,
    description: 'Tamaño de página (1-100, default 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de mascotas con resumen de citas',
    schema: paginatedAdminMascotasSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  async listarMascotas(@Query() query: Record<string, string>) {
    const parsed = adminFiltrosSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
    return this.historialService.getAdminMascotas(parsed.data);
  }
}
