import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreateMedicoDto } from './dto/create-medico.dto';
import { UpdateMedicoDto } from './dto/update-medico.dto';
import { CreateMedicoHorarioDto } from './dto/create-medico-horario.dto';
import { UpdateMedicoHorarioDto } from './dto/update-medico-horario.dto';
import { CreateMedicoAsistenciaDto } from './dto/create-medico-asistencia.dto';

@Controller('api/v1/medicos')
@UseGuards(JwtAuthGuard)
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) {}

  // Médicos
  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body(new ZodValidationPipe(CreateMedicoDto)) dto: CreateMedicoDto) {
    return this.medicosService.create(dto);
  }

  @Get()
  findAll() {
    return this.medicosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicosService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateMedicoDto)) dto: UpdateMedicoDto,
  ) {
    return this.medicosService.update(id, dto);
  }

  // Horarios
  @Post(':id/horarios')
  @UseGuards(RolesGuard)
  @Roles('admin')
  crearHorario(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateMedicoHorarioDto))
    dto: CreateMedicoHorarioDto,
  ) {
    return this.medicosService.crearHorario(id, dto);
  }

  @Get(':id/horarios')
  listarHorarios(@Param('id') id: string) {
    return this.medicosService.listarHorarios(id);
  }

  @Patch(':id/horarios/:horarioId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  actualizarHorario(
    @Param('id') id: string,
    @Param('horarioId') horarioId: string,
    @Body(new ZodValidationPipe(UpdateMedicoHorarioDto))
    dto: UpdateMedicoHorarioDto,
  ) {
    return this.medicosService.actualizarHorario(id, horarioId, dto);
  }

  @Delete(':id/horarios/:horarioId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  eliminarHorario(
    @Param('id') id: string,
    @Param('horarioId') horarioId: string,
  ) {
    return this.medicosService.eliminarHorario(id, horarioId);
  }

  // Asistencias
  @Post(':id/asistencias')
  @UseGuards(RolesGuard)
  @Roles('admin')
  registrarAsistencia(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateMedicoAsistenciaDto))
    dto: CreateMedicoAsistenciaDto,
  ) {
    return this.medicosService.registrarAsistenciaManual(id, dto);
  }

  @Get(':id/asistencias')
  listarAsistencias(
    @Param('id') id: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.medicosService.listarAsistencias(id, desde, hasta);
  }

  @Post(':id/asistencias/salida')
  @UseGuards(RolesGuard)
  @Roles('medico', 'admin')
  marcarSalida(@Param('id') id: string) {
    return this.medicosService.marcarSalida(id);
  }
}
