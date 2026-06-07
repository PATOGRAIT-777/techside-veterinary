import { Module } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { MedicosController } from './medicos.controller';
import { EspecialidadesController } from './especialidades.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityCalculator } from '../citas/helpers/availability-calculator';

@Module({
  imports: [PrismaModule],
  controllers: [MedicosController, EspecialidadesController],
  providers: [MedicosService, AvailabilityCalculator],
  exports: [MedicosService],
})
export class MedicosModule {}
