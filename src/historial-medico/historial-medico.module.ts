import { Module } from '@nestjs/common';
import { HistorialMedicoController } from './historial-medico.controller';
import { HistorialMedicoService } from './historial-medico.service';
import { PdfGeneratorService } from './pdf/pdf-generator.service';

@Module({
  controllers: [HistorialMedicoController],
  providers: [HistorialMedicoService, PdfGeneratorService],
})
export class HistorialMedicoModule {}
