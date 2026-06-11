import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
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
import { ConsultasService } from './consultas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import {
  consultaResponseSchema,
  consultasListSchema,
} from '../common/swagger/consultas.schema';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '../common/swagger/error-responses';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@ApiTags('Consultas')
@Controller('api/v1/consultas')
@UseGuards(JwtAuthGuard)
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}

  @ApiOperation({ summary: 'Create a new medical consultation' })
  @ApiBearerAuth('access-token')
  @ApiBody({
    description: 'Medical consultation payload',
    schema: {
      type: 'object',
      properties: {
        citaId: { type: 'string', format: 'uuid' },
        peso: { type: 'number', format: 'float', nullable: true },
        temperatura: { type: 'number', format: 'float', nullable: true },
        frecuenciaCardiaca: { type: 'integer', nullable: true },
        frecuenciaRespiratoria: { type: 'integer', nullable: true },
        presionArterial: { type: 'string', maxLength: 20, nullable: true },
        estadoGeneral: { type: 'string', maxLength: 500, nullable: true },
        notasEvolucion: { type: 'string', maxLength: 2000, nullable: true },
      },
      required: ['citaId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Consultation created',
    schema: consultaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Post()
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  create(
    @Body(new ZodValidationPipe(CreateConsultaDto)) dto: CreateConsultaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.create(dto, usuario);
  }

  @ApiOperation({ summary: 'List consultations' })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'List of consultations',
    schema: consultasListSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Get()
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.consultasService.findAll(usuario);
  }

  @ApiOperation({ summary: 'Get consultation by appointment ID' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'citaId',
    type: 'string',
    format: 'uuid',
    description: 'Appointment UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Consultation found',
    schema: consultaResponseSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get('cita/:citaId')
  findByCita(
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.findByCita(citaId, usuario);
  }

  @ApiOperation({ summary: 'Get a single consultation by ID' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Consultation UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Consultation found',
    schema: consultaResponseSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.consultasService.findOne(id, usuario);
  }

  @ApiOperation({ summary: 'Update a consultation' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Consultation UUID',
  })
  @ApiBody({
    description:
      'Medical consultation update payload (at least one field required)',
    schema: {
      type: 'object',
      properties: {
        peso: { type: 'number', format: 'float', nullable: true },
        temperatura: { type: 'number', format: 'float', nullable: true },
        frecuenciaCardiaca: { type: 'integer', nullable: true },
        frecuenciaRespiratoria: { type: 'integer', nullable: true },
        presionArterial: { type: 'string', maxLength: 20, nullable: true },
        estadoGeneral: { type: 'string', maxLength: 500, nullable: true },
        notasEvolucion: { type: 'string', maxLength: 2000, nullable: true },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Consultation updated',
    schema: consultaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateConsultaDto)) dto: UpdateConsultaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.update(id, dto, usuario);
  }
}
