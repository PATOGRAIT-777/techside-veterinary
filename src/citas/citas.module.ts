import { Module } from '@nestjs/common';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FolioGenerator } from './helpers/folio-generator';

@Module({
  imports: [PrismaModule],
  controllers: [CitasController],
  providers: [CitasService, FolioGenerator],
  exports: [CitasService],
})
export class CitasModule {}
