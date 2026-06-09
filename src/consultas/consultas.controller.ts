import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('api/v1/consultas')
@UseGuards(JwtAuthGuard)
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  @ApiOperation({ summary: 'Create a new medical consultation' })
  @ApiResponse({
    status: 201,
    description: 'Consultation created',
    schema: consultaResponseSchema,
  })
  create(
    @Body(new ZodValidationPipe(CreateConsultaDto)) dto: CreateConsultaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.create(dto, usuario);
  }

  @Get()
  @ApiOperation({ summary: 'List consultations' })
  @ApiResponse({
    status: 200,
    description: 'List of consultations',
    schema: consultasListSchema,
  })
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.consultasService.findAll(usuario);
  }

  @Get('cita/:citaId')
  @ApiOperation({ summary: 'Get consultation by appointment ID' })
  @ApiResponse({
    status: 200,
    description: 'Consultation found',
    schema: consultaResponseSchema,
  })
  findByCita(
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.findByCita(citaId, usuario);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single consultation by ID' })
  @ApiResponse({
    status: 200,
    description: 'Consultation found',
    schema: consultaResponseSchema,
  })
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.consultasService.findOne(id, usuario);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  @ApiOperation({ summary: 'Update a consultation' })
  @ApiResponse({
    status: 200,
    description: 'Consultation updated',
    schema: consultaResponseSchema,
  })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateConsultaDto)) dto: UpdateConsultaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.update(id, dto, usuario);
  }
}
