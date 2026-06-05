import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateConsultaDto } from './dto/create-consulta.dto';
import { UpdateConsultaDto } from './dto/update-consulta.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('api/v1/consultas')
@UseGuards(JwtAuthGuard)
export class ConsultasController {
  constructor(private readonly consultasService: ConsultasService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  create(
    @Body(new ZodValidationPipe(CreateConsultaDto)) dto: CreateConsultaDto,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.create(dto, usuario);
  }

  @Get()
  findAll(@CurrentUser() usuario: JwtPayload) {
    return this.consultasService.findAll(usuario);
  }

  @Get('cita/:citaId')
  findByCita(
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.consultasService.findByCita(citaId, usuario);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() usuario: JwtPayload) {
    return this.consultasService.findOne(id, usuario);
  }

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
