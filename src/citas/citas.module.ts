import { Module } from '@nestjs/common';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FolioGenerator } from './helpers/folio-generator';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';

@Module({
  imports: [PrismaModule],
  controllers: [CitasController],
  providers: [CitasService, FolioGenerator, CitaEstadoHistorialService],
  exports: [CitasService, CitaEstadoHistorialService],
})
export class CitasModule {}
