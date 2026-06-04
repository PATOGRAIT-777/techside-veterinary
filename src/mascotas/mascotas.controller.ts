import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { MascotasService } from './mascotas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { crearMascotaSchema } from './dto/crear-mascota.dto';
import { actualizarMascotaSchema } from './dto/actualizar-mascota.dto';
import type { CrearMascotaDto } from './dto/crear-mascota.dto';
import type { ActualizarMascotaDto } from './dto/actualizar-mascota.dto';

function normalizeBody(body: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...body };

  if (normalized.peso !== undefined && normalized.peso !== '') {
    normalized.peso = Number(normalized.peso);
  }

  if (normalized.esterilizado !== undefined && normalized.esterilizado !== '') {
    normalized.esterilizado =
      normalized.esterilizado === 'true' || normalized.esterilizado === true;
  }

  if (normalized.alergiaIds !== undefined && normalized.alergiaIds !== '') {
    if (!Array.isArray(normalized.alergiaIds)) {
      normalized.alergiaIds = [normalized.alergiaIds];
    }
  }

  return normalized;
}

@UseGuards(JwtAuthGuard)
@Controller('mascotas')
export class MascotasController {
  constructor(private readonly mascotasService: MascotasService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'foto', maxCount: 1 },
      { name: 'carnet', maxCount: 1 },
    ]),
  )
  async create(
    @Body() body: Record<string, unknown>,
    @CurrentUser('sub') propietarioId: string,
    @UploadedFiles()
    files: {
      foto?: Express.Multer.File[];
      carnet?: Express.Multer.File[];
    },
  ) {
    const parseResult = crearMascotaSchema.safeParse(normalizeBody(body));
    if (!parseResult.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: parseResult.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }

    const dto: CrearMascotaDto = parseResult.data;

    return this.mascotasService.create(propietarioId, dto, {
      foto: files?.foto?.[0],
      carnet: files?.carnet?.[0],
    });
  }

  @Get()
  async findAll(@CurrentUser('sub') propietarioId: string) {
    return this.mascotasService.findAllByOwner(propietarioId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('sub') propietarioId: string,
  ) {
    return this.mascotasService.findOne(id, propietarioId);
  }

  @Patch(':id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'foto', maxCount: 1 },
      { name: 'carnet', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser('sub') propietarioId: string,
    @UploadedFiles()
    files: {
      foto?: Express.Multer.File[];
      carnet?: Express.Multer.File[];
    },
  ) {
    const parseResult = actualizarMascotaSchema.safeParse(normalizeBody(body));
    if (!parseResult.success) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: parseResult.error.issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }

    const dto: ActualizarMascotaDto = parseResult.data;

    return this.mascotasService.update(id, propietarioId, dto, {
      foto: files?.foto?.[0],
      carnet: files?.carnet?.[0],
    });
  }
}
