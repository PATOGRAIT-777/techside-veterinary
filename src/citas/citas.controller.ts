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
import { ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
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
} from '../common/swagger/error-responses';
import {
  citaResponseSchema,
  citasListSchema,
} from '../common/swagger/citas.schema';

@Controller('api/v1/citas')
@UseGuards(JwtAuthGuard)
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @ApiOperation({ summary: 'Create appointment' })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 201,
    description: 'Appointment created',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
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
  @Get()
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.citasService.findAll(usuario);
  }

  @ApiOperation({ summary: 'Get appointment by ID' })
  @ApiBearerAuth('access-token')
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
  @ApiResponse({
    status: 200,
    description: 'Appointment updated',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
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
  @ApiResponse({
    status: 200,
    description: 'Appointment status changed',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
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
  @ApiResponse({
    status: 200,
    description: 'Appointment cancelled',
    schema: citaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('cliente', 'admin')
  remove(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.citasService.remove(id, usuario);
  }
}
