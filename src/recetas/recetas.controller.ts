import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateRecetaDto } from './dto/create-receta.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('api/v1/recetas')
@UseGuards(JwtAuthGuard)
export class RecetasController {
  constructor(private readonly recetasService: RecetasService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  create(
    @Body(new ZodValidationPipe(CreateRecetaDto)) dto: CreateRecetaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.recetasService.create(dto, usuario);
  }

  @Get()
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.recetasService.findAll(usuario);
  }

  @Get('cita/:citaId')
  findByCita(
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.recetasService.findByCita(citaId, usuario);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.recetasService.findOne(id, usuario);
  }
}
