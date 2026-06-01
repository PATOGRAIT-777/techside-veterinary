import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { MxDivisionesService } from './mx-divisiones.service';
import { MxDivision } from '@prisma/client';

@Controller('mx-divisiones')
export class MxDivisionesController {
  constructor(private readonly service: MxDivisionesService) {}

  @Get()
  async findAll(): Promise<MxDivision[]> {
    return this.service.findAll();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<MxDivision> {
    return this.service.findById(id);
  }
}
