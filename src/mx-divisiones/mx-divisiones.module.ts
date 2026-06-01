import { Module } from '@nestjs/common';
import { MxDivisionesService } from './mx-divisiones.service';
import { MxDivisionesController } from './mx-divisiones.controller';

@Module({
  providers: [MxDivisionesService],
  controllers: [MxDivisionesController],
  exports: [MxDivisionesService],
})
export class MxDivisionesModule {}
