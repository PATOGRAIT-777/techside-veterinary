import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Rol } from '@prisma/client';
import { HistorialMedicoService } from './historial-medico.service';
import { adminFiltrosSchema } from './dto/admin-filtros.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.admin)
@Controller('admin/historial-mascotas')
export class AdminHistorialController {
  constructor(private readonly historialService: HistorialMedicoService) {}

  @Get()
  async listarMascotas(@Query() query: Record<string, string>) {
    const parsed = adminFiltrosSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }
    return this.historialService.getAdminMascotas(parsed.data);
  }
}
