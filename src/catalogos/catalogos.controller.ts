import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

@UseGuards(JwtAuthGuard)
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  @Get('especies')
  findAllEspecies() {
    return this.catalogosService.findAllEspecies();
  }

  @Get('razas')
  findAllRazas(@Query('especieId') especieId?: string) {
    if (especieId !== undefined && !isUUID(especieId)) {
      throw new BadRequestException('especieId must be a valid UUID');
    }
    return this.catalogosService.findAllRazas(especieId);
  }

  @Get('colores')
  findAllColores() {
    return this.catalogosService.findAllColores();
  }

  @Get('tipos-pelo')
  findAllTiposPelo() {
    return this.catalogosService.findAllTiposPelo();
  }

  @Get('patrones-pelo')
  findAllPatronesPelo() {
    return this.catalogosService.findAllPatronesPelo();
  }

  @Get('comportamientos')
  findAllComportamientos() {
    return this.catalogosService.findAllComportamientos();
  }

  @Get('alergias')
  findAllAlergias() {
    return this.catalogosService.findAllAlergias();
  }
}
