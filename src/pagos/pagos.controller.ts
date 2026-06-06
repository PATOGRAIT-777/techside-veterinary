import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { CreatePagoDto } from './dto/create-pago.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('api/v1/pagos')
@UseGuards(JwtAuthGuard)
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  @Post()
  async create(@Body() dto: CreatePagoDto) {
    return this.pagosService.create(dto);
  }

  @Get(':folioPago')
  async findByFolio(@Param('folioPago') folioPago: string) {
    return this.pagosService.findByFolio(folioPago);
  }
}
