import { Module } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { MedicosController } from './medicos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MedicosController],
  providers: [MedicosService],
  exports: [MedicosService],
})
export class MedicosModule {}
