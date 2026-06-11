import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
    schema: { type: 'object' },
  })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse()
  @Get(':folioPago')
  async findByFolio(@Param('folioPago') folioPago: string) {
    return this.pagosService.findByFolio(folioPago);
  }
}
