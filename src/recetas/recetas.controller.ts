import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { RecetasService } from './recetas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateRecetaDto } from './dto/create-receta.dto';
import {
  recetaResponseSchema,
  recetasListSchema,
} from '../common/swagger/recetas.schema';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '../common/swagger/error-responses';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Recetas')
@Controller('api/v1/recetas')
@UseGuards(JwtAuthGuard)
export class RecetasController {
  constructor(private readonly recetasService: RecetasService) {}

  @ApiOperation({ summary: 'Crear una receta para una cita en curso' })
  @ApiBearerAuth('access-token')
  @ApiBody({
    description: 'Prescription payload',
    schema: {
      type: 'object',
      properties: {
        citaId: { type: 'string', format: 'uuid' },
        diagnostico: { type: 'string', minLength: 1, maxLength: 2000 },
        observaciones: { type: 'string', maxLength: 2000, nullable: true },
        detalles: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          items: {
            type: 'object',
            properties: {
              medicamento: { type: 'string', minLength: 1, maxLength: 500 },
              dosis: { type: 'string', minLength: 1, maxLength: 255 },
              frecuencia: { type: 'string', minLength: 1, maxLength: 255 },
              duracion: { type: 'string', minLength: 1, maxLength: 255 },
              viaAdministracion: {
                type: 'string',
                minLength: 1,
                maxLength: 255,
              },
              instrucciones: {
                type: 'string',
                maxLength: 1000,
                nullable: true,
              },
            },
            required: [
              'medicamento',
              'dosis',
              'frecuencia',
              'duracion',
              'viaAdministracion',
            ],
          },
        },
      },
      required: ['citaId', 'diagnostico', 'detalles'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Receta creada',
    schema: recetaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Post()
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  create(
    @Body(new ZodValidationPipe(CreateRecetaDto)) dto: CreateRecetaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.recetasService.create(dto, usuario);
  }

  @ApiOperation({ summary: 'Listar recetas del usuario autenticado' })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'Lista de recetas',
    schema: recetasListSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Get()
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.recetasService.findAll(usuario);
  }

  @ApiOperation({ summary: 'Obtener receta por ID de cita' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'citaId',
    type: 'string',
    format: 'uuid',
    description: 'Appointment UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Receta encontrada',
    schema: recetaResponseSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get('cita/:citaId')
  findByCita(
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.recetasService.findByCita(citaId, usuario);
  }

  @ApiOperation({ summary: 'Obtener receta por ID' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Prescription UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Receta encontrada',
    schema: recetaResponseSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.recetasService.findOne(id, usuario);
  }
}
