import { Module } from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { RecetasController } from './recetas.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CitasModule } from '../citas/citas.module';

@Module({
  imports: [PrismaModule, CitasModule],
  controllers: [RecetasController],
  providers: [RecetasService],
})
export class RecetasModule {}
