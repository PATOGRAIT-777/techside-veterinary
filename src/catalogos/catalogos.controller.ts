import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CatalogosService } from './catalogos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiUnauthorizedResponse } from '../common/swagger/error-responses';
import { catalogoItemSchema } from '../common/swagger/catalogos.schema';

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

@ApiTags('Catálogos')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @ApiOperation({ summary: 'Listar especies' })
  @ApiResponse({
    status: 200,
    description: 'Listado de especies',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('especies')
  findAllEspecies() {
    return this.catalogosService.findAllEspecies();
  }

  @ApiOperation({ summary: 'Listar razas' })
  @ApiQuery({
    name: 'especieId',
    type: 'string',
    format: 'uuid',
    required: false,
    description: 'Filtrar por ID de especie',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de razas',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('razas')
  findAllRazas(@Query('especieId') especieId?: string) {
    if (especieId !== undefined && !isUUID(especieId)) {
      throw new BadRequestException('especieId must be a valid UUID');
    }
    return this.catalogosService.findAllRazas(especieId);
  }

  @ApiOperation({ summary: 'Listar colores' })
  @ApiResponse({
    status: 200,
    description: 'Listado de colores',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('colores')
  findAllColores() {
    return this.catalogosService.findAllColores();
  }

  @ApiOperation({ summary: 'Listar tipos de pelo' })
  @ApiResponse({
    status: 200,
    description: 'Listado de tipos de pelo',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('tipos-pelo')
  findAllTiposPelo() {
    return this.catalogosService.findAllTiposPelo();
  }

  @ApiOperation({ summary: 'Listar patrones de pelo' })
  @ApiResponse({
    status: 200,
    description: 'Listado de patrones de pelo',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('patrones-pelo')
  findAllPatronesPelo() {
    return this.catalogosService.findAllPatronesPelo();
  }

  @ApiOperation({ summary: 'Listar comportamientos' })
  @ApiResponse({
    status: 200,
    description: 'Listado de comportamientos',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('comportamientos')
  findAllComportamientos() {
    return this.catalogosService.findAllComportamientos();
  }

  @ApiOperation({ summary: 'Listar alergias' })
  @ApiResponse({
    status: 200,
    description: 'Listado de alergias',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('alergias')
  findAllAlergias() {
    return this.catalogosService.findAllAlergias();
  }

  @ApiOperation({ summary: 'Listar servicios' })
  @ApiResponse({
    status: 200,
    description: 'Listado de servicios',
    schema: { type: 'array', items: catalogoItemSchema },
  })
  @ApiUnauthorizedResponse()
  @Get('servicios')
  findServicios() {
    return this.catalogosService.findServicios();
  }
}
