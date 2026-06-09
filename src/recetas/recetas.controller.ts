import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('api/v1/recetas')
@UseGuards(JwtAuthGuard)
export class RecetasController {
  constructor(private readonly recetasService: RecetasService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear una receta para una cita en curso' })
  @ApiResponse({
    status: 201,
    description: 'Receta creada',
    schema: recetaResponseSchema,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Cita no encontrada' })
  create(
    @Body(new ZodValidationPipe(CreateRecetaDto)) dto: CreateRecetaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.recetasService.create(dto, usuario);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar recetas del usuario autenticado' })
  @ApiResponse({
    status: 200,
    description: 'Lista de recetas',
    schema: recetasListSchema,
  })
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.recetasService.findAll(usuario);
  }

  @Get('cita/:citaId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener receta por ID de cita' })
  @ApiResponse({
    status: 200,
    description: 'Receta encontrada',
    schema: recetaResponseSchema,
  })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  findByCita(
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.recetasService.findByCita(citaId, usuario);
  }

  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener receta por ID' })
  @ApiResponse({
    status: 200,
    description: 'Receta encontrada',
    schema: recetaResponseSchema,
  })
  @ApiResponse({ status: 404, description: 'Receta no encontrada' })
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.recetasService.findOne(id, usuario);
  }
}
