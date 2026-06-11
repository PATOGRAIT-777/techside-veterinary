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
import {
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { MascotasService } from './mascotas.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { Rol } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { crearMascotaSchema } from './dto/crear-mascota.dto';
import { actualizarMascotaSchema } from './dto/actualizar-mascota.dto';
import type { CrearMascotaDto } from './dto/crear-mascota.dto';
import type { ActualizarMascotaDto } from './dto/actualizar-mascota.dto';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
} from '../common/swagger/error-responses';
import { mascotaResponseSchema } from '../common/swagger/mascota.schema';

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

  @ApiOperation({
    summary: 'Create a new pet record',
    description:
      'Creates a mascota for the authenticated owner.\n\nAllowed file types: application/pdf, image/jpeg, image/png.',
  })
  @ApiBearerAuth('access-token')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          example: 'Luna',
        },
        razaId: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        colorId: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        tipoPeloId: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        patronPeloId: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        comportamientoId: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        fechaNacimiento: {
          type: 'string',
          format: 'date-time',
          example: '2020-05-15T00:00:00Z',
        },
        sexo: {
          type: 'string',
          enum: ['Macho', 'Hembra'],
          example: 'Hembra',
        },
        peso: {
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
          example: 12.5,
        },
        esterilizado: {
          type: 'boolean',
          example: true,
        },
        ruac: {
          type: 'string',
          maxLength: 50,
          example: 'RUAC-12345',
        },
        microchip: {
          type: 'string',
          maxLength: 100,
          nullable: true,
          example: '985112345678901',
        },
        tatuaje: {
          type: 'string',
          maxLength: 100,
          example: 'TAT-001',
        },
        observaciones: {
          type: 'string',
          maxLength: 2000,
          example: 'Alergia a penicilina',
        },
        alergiaIds: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uuid',
          },
          example: ['aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'],
        },
        propietarioId: {
          type: 'string',
          format: 'uuid',
          example: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        },
        foto: {
          type: 'string',
          format: 'binary',
          description: 'Pet photo (PDF, JPG, PNG)',
        },
        carnet: {
          type: 'string',
          format: 'binary',
          description: 'Vaccination card (PDF, JPG, PNG)',
        },
      },
      required: ['nombre'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Pet created',
    schema: mascotaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiTooManyRequestsResponse()
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  @Roles(Rol.cliente, Rol.medico, Rol.admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'foto', maxCount: 1 },
      { name: 'carnet', maxCount: 1 },
    ]),
  )
  async create(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: JwtPayload,
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

    return this.mascotasService.create({ sub: user.sub, rol: user.rol }, dto, {
      foto: files?.foto?.[0],
      carnet: files?.carnet?.[0],
    });
  }

  @ApiOperation({ summary: 'List pets for the authenticated owner' })
  @ApiBearerAuth('access-token')
  @ApiResponse({
    status: 200,
    description: 'List of pets',
    schema: {
      type: 'array',
      items: mascotaResponseSchema,
    },
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @Get()
  async findAll(@CurrentUser('sub') propietarioId: string) {
    return this.mascotasService.findAllByOwner(propietarioId);
  }

  @ApiOperation({ summary: 'Get a single pet by ID' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Pet UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Pet found',
    schema: mascotaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser('sub') propietarioId: string,
  ) {
    return this.mascotasService.findOne(id, propietarioId);
  }

  @ApiOperation({
    summary: 'Update a pet record',
    description:
      'Partial update of a mascota. All body fields and file uploads are optional.\n\nAllowed file types: application/pdf, image/jpeg, image/png.',
  })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Pet UUID',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          minLength: 1,
          maxLength: 100,
          example: 'Luna',
        },
        razaId: {
          type: 'string',
          format: 'uuid',
        },
        colorId: {
          type: 'string',
          format: 'uuid',
        },
        tipoPeloId: {
          type: 'string',
          format: 'uuid',
        },
        patronPeloId: {
          type: 'string',
          format: 'uuid',
        },
        comportamientoId: {
          type: 'string',
          format: 'uuid',
        },
        fechaNacimiento: {
          type: 'string',
          format: 'date-time',
        },
        sexo: {
          type: 'string',
          enum: ['Macho', 'Hembra'],
        },
        peso: {
          type: 'number',
          minimum: 0,
          exclusiveMinimum: true,
        },
        esterilizado: {
          type: 'boolean',
        },
        ruac: {
          type: 'string',
          maxLength: 50,
        },
        microchip: {
          type: 'string',
          maxLength: 100,
          nullable: true,
        },
        tatuaje: {
          type: 'string',
          maxLength: 100,
        },
        observaciones: {
          type: 'string',
          maxLength: 2000,
        },
        alergiaIds: {
          type: 'array',
          items: {
            type: 'string',
            format: 'uuid',
          },
        },
        foto: {
          type: 'string',
          format: 'binary',
          description: 'Pet photo (PDF, JPG, PNG)',
        },
        carnet: {
          type: 'string',
          format: 'binary',
          description: 'Vaccination card (PDF, JPG, PNG)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Pet updated',
    schema: mascotaResponseSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  @ApiTooManyRequestsResponse()
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
