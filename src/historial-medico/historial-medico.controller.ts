import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HistorialMedicoService } from './historial-medico.service';
import { citasPasadasQuerySchema } from './dto/citas-pasadas-query.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '../common/swagger/error-responses';

const citaResumenSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    estado: {
      type: 'string',
      enum: [
        'pendiente',
        'pendiente_de_pago',
        'en_curso',
        'completada',
        'inasistencia',
        'cancelada',
      ],
    },
    especialidad: { type: 'string' },
    medico: { type: 'string' },
    fecha: { type: 'string', format: 'date-time' },
    horaInicio: { type: 'string', format: 'time' },
    horaFin: { type: 'string', format: 'time' },
    sucursal: { type: 'string' },
    motivo: { type: 'string', nullable: true },
    estadoPago: {
      type: 'string',
      nullable: true,
      enum: ['pendiente', 'pagada', 'fallida', 'reembolsada'],
    },
  },
};

const recetaDetalleSchema = {
  type: 'object',
  properties: {
    diagnostico: { type: 'string' },
    observaciones: { type: 'string', nullable: true },
    fechaReceta: { type: 'string', format: 'date-time' },
    detalles: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          medicamento: { type: 'string' },
          dosis: { type: 'string' },
          frecuencia: { type: 'string' },
          duracion: { type: 'string' },
          viaAdministracion: { type: 'string' },
          instrucciones: { type: 'string', nullable: true },
        },
      },
    },
  },
};

const consultaDetalleSchema = {
  type: 'object',
  properties: {
    peso: { type: 'number', nullable: true },
    temperatura: { type: 'number', nullable: true },
    frecuenciaCardiaca: { type: 'integer', nullable: true },
    frecuenciaRespiratoria: { type: 'integer', nullable: true },
    presionArterial: { type: 'string', nullable: true },
    estadoGeneral: { type: 'string', nullable: true },
    notasEvolucion: { type: 'string', nullable: true },
  },
};

const pagoDetalleSchema = {
  type: 'object',
  properties: {
    folioPago: { type: 'string' },
    cantidad: { type: 'number' },
    estado: {
      type: 'string',
      enum: ['pendiente', 'pagada', 'fallida', 'reembolsada'],
    },
    fechaPago: { type: 'string', format: 'date-time', nullable: true },
  },
};

const mascotaInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    nombre: { type: 'string' },
    raza: { type: 'string', nullable: true },
    color: { type: 'string', nullable: true },
    fechaNacimiento: { type: 'string', format: 'date-time', nullable: true },
    sexo: { type: 'string', nullable: true },
    esterilizado: { type: 'boolean' },
    ruac: { type: 'string', nullable: true },
    microchip: { type: 'string', nullable: true },
    fotoPerfilUrl: { type: 'string', nullable: true },
    carnetVacunacionUrl: { type: 'string', nullable: true },
    observaciones: { type: 'string', nullable: true },
    alergias: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          notas: { type: 'string', nullable: true },
        },
      },
    },
    comportamiento: { type: 'string', nullable: true },
    requiereBozal: { type: 'boolean' },
  },
};

const historialResumenSchema = {
  type: 'object',
  properties: {
    mascota: mascotaInfoSchema,
    agregados: {
      type: 'object',
      properties: {
        frecuenciaCardiacaPromedio: { type: 'number', nullable: true },
        ultimaVisita: { type: 'string', format: 'date-time', nullable: true },
        proximaVisita: { type: 'string', format: 'date-time', nullable: true },
      },
    },
    proximasCitas: { type: 'array', items: citaResumenSchema },
    ultimasCitas: { type: 'array', items: citaResumenSchema },
    pesoActual: { type: 'number', nullable: true },
    pesoHistorial: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fecha: { type: 'string', format: 'date-time' },
          peso: { type: 'number' },
        },
      },
    },
    propietario: {
      type: 'object',
      nullable: true,
      properties: {
        nombreCompleto: { type: 'string' },
        telefono: { type: 'string' },
        email: { type: 'string', format: 'email' },
      },
    },
  },
};

const citaDetalleSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    estado: {
      type: 'string',
      enum: [
        'pendiente',
        'pendiente_de_pago',
        'en_curso',
        'completada',
        'inasistencia',
        'cancelada',
      ],
    },
    especialidad: { type: 'string' },
    medico: { type: 'string' },
    fecha: { type: 'string', format: 'date-time' },
    horaInicio: { type: 'string', format: 'time' },
    horaFin: { type: 'string', format: 'time' },
    sucursal: { type: 'string' },
    motivo: { type: 'string', nullable: true },
    receta: { ...recetaDetalleSchema, nullable: true },
    consulta: { ...consultaDetalleSchema, nullable: true },
    pago: { ...pagoDetalleSchema, nullable: true },
  },
};

const paginatedCitasSchema = {
  type: 'object',
  properties: {
    data: { type: 'array', items: citaResumenSchema },
    meta: {
      type: 'object',
      properties: {
        nextCursor: { type: 'string', nullable: true },
        limit: { type: 'integer' },
        hasMore: { type: 'boolean' },
      },
    },
  },
};

const pesoHistorialSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fecha: { type: 'string', format: 'date-time' },
          peso: { type: 'number' },
        },
      },
    },
  },
};

@ApiTags('Historial Médico')
@Controller('mascotas/:mascotaId/historial')
@UseGuards(JwtAuthGuard)
export class HistorialMedicoController {
  constructor(private readonly historialService: HistorialMedicoService) {}

  @Get()
  @ApiOperation({ summary: 'Ver resumen del historial médico de una mascota' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'mascotaId',
    type: 'string',
    format: 'uuid',
    description: 'UUID de la mascota',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen del historial médico',
    schema: historialResumenSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getResumen(
    @Param('mascotaId') mascotaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getResumen(mascotaId, usuario);
  }

  @Get('citas-proximas')
  @ApiOperation({ summary: 'Ver citas próximas de una mascota' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'mascotaId',
    type: 'string',
    format: 'uuid',
    description: 'UUID de la mascota',
  })
  @ApiResponse({
    status: 200,
    description: 'Citas próximas',
    schema: {
      type: 'object',
      properties: { data: { type: 'array', items: citaResumenSchema } },
    },
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getCitasProximas(
    @Param('mascotaId') mascotaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getCitasProximas(mascotaId, usuario);
  }

  @Get('citas-pasadas')
  @ApiOperation({ summary: 'Ver historial de citas pasadas de una mascota' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'mascotaId',
    type: 'string',
    format: 'uuid',
    description: 'UUID de la mascota',
  })
  @ApiQuery({
    name: 'cursor',
    type: 'string',
    required: false,
    description: 'Cursor de paginación (base64)',
  })
  @ApiQuery({
    name: 'limit',
    type: 'integer',
    required: false,
    description: 'Tamaño de página (1-100, default 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Citas pasadas paginadas',
    schema: paginatedCitasSchema,
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getCitasPasadas(
    @Param('mascotaId') mascotaId: string,
    @Query() query: Record<string, string>,
    @CurrentUser() usuario: JwtPayload,
  ) {
    const parsed = citasPasadasQuerySchema.safeParse(query);
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
    return this.historialService.getCitasPasadas(
      mascotaId,
      usuario,
      parsed.data.cursor,
      parsed.data.limit,
    );
  }

  @Get('citas/:citaId')
  @ApiOperation({ summary: 'Ver detalle de una cita en el historial' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'mascotaId',
    type: 'string',
    format: 'uuid',
    description: 'UUID de la mascota',
  })
  @ApiParam({
    name: 'citaId',
    type: 'string',
    format: 'uuid',
    description: 'UUID de la cita',
  })
  @ApiResponse({
    status: 200,
    description: 'Detalle de la cita',
    schema: citaDetalleSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getCitaDetalle(
    @Param('mascotaId') mascotaId: string,
    @Param('citaId') citaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getCitaDetalle(mascotaId, citaId, usuario);
  }

  @Get('peso')
  @ApiOperation({ summary: 'Ver historial de peso de una mascota' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'mascotaId',
    type: 'string',
    format: 'uuid',
    description: 'UUID de la mascota',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial de peso',
    schema: pesoHistorialSchema,
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getPesoHistorial(
    @Param('mascotaId') mascotaId: string,
    @CurrentUser() usuario: JwtPayload,
  ) {
    return this.historialService.getPesoHistorial(mascotaId, usuario);
  }

  @Get('pdf')
  @ApiOperation({ summary: 'Descargar historial médico en PDF' })
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'mascotaId',
    type: 'string',
    format: 'uuid',
    description: 'UUID de la mascota',
  })
  @ApiProduces('application/pdf')
  @ApiResponse({
    status: 200,
    description: 'PDF del historial médico',
    content: {
      'application/pdf': { schema: { type: 'string', format: 'binary' } },
    },
  })
  @ApiUnauthorizedResponse()
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
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
