import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { EstadoPago, EstadoCita } from '@prisma/client';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  buscarPagosQuerySchema,
  type BuscarPagosQueryDto,
} from './dto/buscar-pagos-query.dto';
import type {
  PagoResponseDto,
  PaginatedPagosResponseDto,
} from './dto/pago-response.dto';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '../common/swagger/error-responses';

@ApiTags('Pagos')
@ApiBearerAuth('access-token')
@Controller('api/v1/pagos')
@UseGuards(JwtAuthGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @ApiOperation({ summary: 'Registrar un pago' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        folioPago: {
          type: 'string',
          pattern: '^VET-\\d{8}-\\d{4}$',
          example: 'VET-20240115-0001',
          description: 'Formato VET-YYYYMMDD-XXXX',
        },
      },
      required: ['folioPago'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pago registrado',
    schema: { type: 'object' },
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @Post()
  async create(@Body() dto: CreatePagoDto) {
    return this.pagosService.create(dto);
  }

  @ApiOperation({ summary: 'Listar pagos' })
  @ApiQuery({
    name: 'estado',
    enum: EstadoPago,
    required: false,
    description: 'Filtrar por estado del pago',
  })
  @ApiQuery({
    name: 'limit',
    type: 'integer',
    required: false,
    description: 'Cantidad de resultados (default 20, max 100)',
  })
  @ApiQuery({
    name: 'offset',
    type: 'integer',
    required: false,
    description: 'Desplazamiento para paginación (default 0)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pagos',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PagoResponseDto' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @Get()
  async findAll(
    @Query(new ZodValidationPipe(buscarPagosQuerySchema))
    query: BuscarPagosQueryDto,
    @CurrentUser() usuario: JwtPayload,
  ): Promise<PaginatedPagosResponseDto> {
    return this.pagosService.findAll(query, usuario);
  }

  @ApiOperation({ summary: 'Consultar pago por folio' })
  @ApiParam({
    name: 'folioPago',
    type: 'string',
    description: 'Formato VET-YYYYMMDD-XXXX',
    example: 'VET-20240115-0001',
  })
  @ApiResponse({
    status: 200,
    description: 'Pago encontrado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        folioPago: { type: 'string' },
        cantidad: { type: 'number' },
        estado: { type: 'string', enum: Object.values(EstadoPago) },
        fechaPago: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        cita: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            estado: { type: 'string', enum: Object.values(EstadoCita) },
            fecha: { type: 'string', format: 'date-time' },
            horaInicio: { type: 'string', format: 'date-time' },
            mascota: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            servicio: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            sucursal: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombre: { type: 'string' },
              },
            },
            medico: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nombreCompleto: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @Get(':folioPago')
  async findByFolio(
    @Param('folioPago') folioPago: string,
    @CurrentUser() usuario: JwtPayload,
  ): Promise<PagoResponseDto> {
    return this.pagosService.findByFolio(folioPago, usuario);
  }
}
