import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ArchivosModule } from '../archivos/archivos.module';
import { MascotasService } from './mascotas.service';
import { MascotasController } from './mascotas.controller';

@Module({
  imports: [PrismaModule, ArchivosModule],
  controllers: [MascotasController],
  providers: [MascotasService],
})
export class MascotasModule {}
