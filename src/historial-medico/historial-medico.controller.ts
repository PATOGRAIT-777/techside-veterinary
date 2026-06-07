import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HistorialMedicoService } from './historial-medico.service';
import { citasPasadasQuerySchema } from './dto/citas-pasadas-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('mascotas/:mascotaId/historial')
export class HistorialMedicoController {
  constructor(private readonly historialService: HistorialMedicoService) {}

  @Get()
  async getResumen(
    @Param('mascotaId') mascotaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getResumen(mascotaId, usuario);
  }

  @Get('citas-proximas')
  async getCitasProximas(
    @Param('mascotaId') mascotaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getCitasProximas(mascotaId, usuario);
  }

  @Get('citas-pasadas')
  async getCitasPasadas(
    @Param('mascotaId') mascotaId: string,
    @Query() query: Record<string, string>,
    @CurrentUser() usuario: JwtPayload,
  ) {
    const parsed = citasPasadasQuerySchema.parse(query);
    return this.historialService.getCitasPasadas(
      mascotaId,
      usuario,
      parsed.cursor,
      parsed.limit,
    );
  }

  @Get('citas/:citaId')
  async getCitaDetalle(
    @Param('mascotaId') mascotaId: string,
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getCitaDetalle(mascotaId, citaId, usuario);
  }

  @Get('peso')
  async getPesoHistorial(
    @Param('mascotaId') mascotaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getPesoHistorial(mascotaId, usuario);
  }

  @Get('pdf')
  async getPdf(
    @Param('mascotaId') mascotaId: string,
    @CurrentUser() usuario: JwtPayload,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.historialService.generatePdf(
      mascotaId,
      usuario,
    );
    const filename = `historial-${mascotaId.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  }
}
