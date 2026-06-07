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

@Controller('api/v1/citas')
@UseGuards(JwtAuthGuard)
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('cliente', 'admin')
  create(
    @Body(new ZodValidationPipe(CreateCitaDto)) dto: CreateCitaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.citasService.create(dto, usuario);
  }

  @Get()
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.citasService.findAll(usuario);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.citasService.findOne(id, usuario);
  }

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

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('cliente', 'admin')
  remove(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.citasService.remove(id, usuario);
  }
}
