import { Module } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { PagosController } from './pagos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CitasModule } from '../citas/citas.module';

@Module({
  imports: [PrismaModule, CitasModule],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
