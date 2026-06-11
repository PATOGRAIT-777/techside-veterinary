import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CitasService } from './citas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { CambiarEstadoCitaDto } from './dto/cambiar-estado-cita.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
} from '../common/swagger/error-responses';
import {
  citaResponseSchema,
  citasListSchema,
} from '../common/swagger/citas.schema';

@ApiTags('Citas')
@Controller('api/v1/citas')
@UseGuards(JwtAuthGuard)
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @ApiOperation({ summary: 'Create appointment' })
  @ApiBearerAuth('access-token')
  @ApiBody({
    description: 'Appointment creation payload',
    schema: {
      type: 'object',
      properties: {
        emailUsuario: {
          type: 'string',
          format: 'email',
          nullable: true,
          description: 'Optional user email to assign the appointment',
        },
        sucursalId: { type: 'string', format: 'uuid' },
        medicoId: { type: 'string', format: 'uuid' },
        mascotaId: { type: 'string', format: 'uuid' },
        servicioId: { type: 'string', format: 'uuid' },
        fecha: {
          type: 'string',
          format: 'date',
          description: 'Formato YYYY-MM-DD',
          example: '2025-12-25',
        },
        horaInicio: {
          type: 'string',
          format: 'time',
          description: 'Formato HH:MM',
          example: '09:00',
        },
        motivo: { type: 'string', maxLength: 500, nullable: true },
      },
      required: [
        'sucursalId',
        'medicoId',
        'mascotaId',
        'servicioId',
        'fecha',
        'horaInicio',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Appointment created',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiTooManyRequestsResponse()
  @Post()
  @UseGuards(RolesGuard)
  @Roles('cliente', 'admin')
  create(
    @Body(new ZodValidationPipe(CreateCitaDto)) dto: CreateCitaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.citasService.create(dto, usuario);
  }

  @ApiOperation({ summary: 'List appointments' })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'Appointments list',
    schema: citasListSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get()
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.citasService.findAll(usuario);
  }

  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Appointment UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment found',
    schema: citaResponseSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.citasService.findOne(id, usuario);
  }

  @ApiOperation({ summary: 'Update appointment' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Appointment UUID',
  })
  @ApiBody({
    description: 'Appointment update payload (at least one field required)',
    schema: {
      type: 'object',
      properties: {
        sucursalId: { type: 'string', format: 'uuid', nullable: true },
        medicoId: { type: 'string', format: 'uuid', nullable: true },
        servicioId: { type: 'string', format: 'uuid', nullable: true },
        fecha: {
          type: 'string',
          format: 'date',
          nullable: true,
          description: 'Formato YYYY-MM-DD',
        },
        horaInicio: {
          type: 'string',
          format: 'time',
          nullable: true,
          description: 'Formato HH:MM',
        },
        motivo: { type: 'string', maxLength: 500, nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment updated',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiTooManyRequestsResponse()
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('cliente', 'admin')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateCitaDto)) dto: UpdateCitaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.citasService.update(id, dto, usuario);
  }

  @ApiOperation({ summary: 'Change appointment status' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Appointment UUID',
  })
  @ApiBody({
    description: 'New appointment status',
    schema: {
      type: 'object',
      properties: {
        estado: {
          type: 'string',
          enum: ['pendiente', 'en_curso', 'inasistencia', 'cancelada'],
          description:
            'Estado de cita no válido. No se permite cambiar directamente a pendiente_de_pago ni completada',
        },
      },
      required: ['estado'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment status changed',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiTooManyRequestsResponse()
  @Patch(':id/estado')
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  cambiarEstado(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CambiarEstadoCitaDto))
    dto: CambiarEstadoCitaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.citasService.cambiarEstado(id, dto, usuario);
  }

  @ApiOperation({ summary: 'Cancel appointment' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Appointment UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiTooManyRequestsResponse()
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('cliente', 'admin')
  remove(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.citasService.remove(id, usuario);
  }
}
