import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Rol } from '@prisma/client';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  buscarUsuariosQuerySchema,
  type BuscarUsuariosQueryDto,
} from './dto/buscar-usuarios-query.dto';
import { UsuarioResumenDto } from './dto/usuario-resumen.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.medico, Rol.admin)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async search(
    @Query(new ZodValidationPipe(buscarUsuariosQuerySchema))
    query: BuscarUsuariosQueryDto,
  ): Promise<{ data: UsuarioResumenDto[]; total: number }> {
    return this.usuariosService.search(query);
  }
}
