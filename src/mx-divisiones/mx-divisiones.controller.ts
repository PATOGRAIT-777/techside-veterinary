import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MxDivisionesService } from './mx-divisiones.service';
import { MxDivision } from '@prisma/client';

@ApiTags('Sucursales')
@Controller('mx-divisiones')
export class MxDivisionesController {
  constructor(private readonly service: MxDivisionesService) {}

  @ApiOperation({ summary: 'Listar sucursales' })
  @ApiResponse({
    status: 200,
    description: 'Listado de sucursales',
    schema: { type: 'array', items: { type: 'object' } },
  })
  @Get()
  async findAll(): Promise<MxDivision[]> {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Obtener sucursal por ID' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID de la sucursal',
  })
  @ApiResponse({
    status: 200,
    description: 'Sucursal encontrada',
    schema: { type: 'object' },
  })
  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<MxDivision> {
    return this.service.findById(id);
  }
}
