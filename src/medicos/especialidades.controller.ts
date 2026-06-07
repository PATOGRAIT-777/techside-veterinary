import { Controller, Get, UseGuards } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/v1/especialidades')
@UseGuards(JwtAuthGuard)
export class EspecialidadesController {
  constructor(private readonly medicosService: MedicosService) {}

  @Get()
  findAll() {
    return this.medicosService.findAllEspecialidades();
  }
}
