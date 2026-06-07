import { Module } from '@nestjs/common';
import { HistorialMedicoController } from './historial-medico.controller';
import { AdminHistorialController } from './admin-historial.controller';
import { HistorialMedicoService } from './historial-medico.service';
import { PdfGeneratorService } from './pdf/pdf-generator.service';

@Module({
  controllers: [HistorialMedicoController, AdminHistorialController],
  providers: [HistorialMedicoService, PdfGeneratorService],
})
export class HistorialMedicoModule {}
