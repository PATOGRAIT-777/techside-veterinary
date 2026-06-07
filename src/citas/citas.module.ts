import { Module } from '@nestjs/common';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { FolioGenerator } from './helpers/folio-generator';
import { CitaEstadoHistorialService } from './cita-estado-historial.service';
import { CitaCompletionService } from './cita-completion.service';
import { CitasCronService } from './citas-cron.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [CitasController],
  providers: [
    CitasService,
    FolioGenerator,
    CitaEstadoHistorialService,
    CitaCompletionService,
    CitasCronService,
  ],
  exports: [CitasService, CitaEstadoHistorialService, CitaCompletionService],
})
export class CitasModule {}
