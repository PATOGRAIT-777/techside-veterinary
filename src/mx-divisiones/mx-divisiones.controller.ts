import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MxDivisionesService } from './mx-divisiones.service';
import { MxDivision, Sucursal } from '@prisma/client';

@ApiTags('Sucursales')
@Controller()
export class MxDivisionesController {
  constructor(private readonly service: MxDivisionesService) {}

  @ApiOperation({ summary: 'Listar divisiones MX' })
  @ApiResponse({
    status: 200,
    description: 'Listado de divisiones MX',
    schema: { type: 'array', items: { type: 'object' } },
  })
  @Get('mx-divisiones')
  async findAll(): Promise<MxDivision[]> {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Obtener división MX por ID' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID de la división MX',
  })
  @ApiResponse({
    status: 200,
    description: 'División MX encontrada',
    schema: { type: 'object' },
  })
  @Get('mx-divisiones/:id')
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<MxDivision> {
    return this.service.findById(id);
  }

  @ApiOperation({ summary: 'Listar sucursales activas' })
  @ApiResponse({
    status: 200,
    description: 'Listado de sucursales activas para registro y citas',
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
  @Get('sucursales')
  async findSucursales(): Promise<Pick<Sucursal, 'id' | 'nombre'>[]> {
    return this.service.findSucursales();
  }
}
