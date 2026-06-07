import { Module } from '@nestjs/common';
import { ConsultasService } from './consultas.service';
import { ConsultasController } from './consultas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CitasModule } from '../citas/citas.module';

@Module({
  imports: [PrismaModule, CitasModule],
  controllers: [ConsultasController],
  providers: [ConsultasService],
})
export class ConsultasModule {}
