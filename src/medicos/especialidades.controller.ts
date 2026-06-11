import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MedicosService } from './medicos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiUnauthorizedResponse } from '../common/swagger/error-responses';

@ApiTags('Especialidades')
@ApiBearerAuth('access-token')
@Controller('api/v1/especialidades')
@UseGuards(JwtAuthGuard)
export class EspecialidadesController {
  constructor(private readonly medicosService: MedicosService) {}

  @ApiOperation({ summary: 'Listar especialidades' })
  @ApiResponse({
    status: 200,
    description: 'Listado de especialidades',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nombre: { type: 'string' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse()
  @Get()
  findAll() {
    return this.medicosService.findAllEspecialidades();
  }
}
