import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Rol } from '@prisma/client';
import {
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { loginSchema } from './dto/login.dto';
import type { LoginDto } from './dto/login.dto';
import { registerSchema } from './dto/register.dto';
import type { RegisterDto } from './dto/register.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '../common/swagger/error-responses';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Login a user',
    description:
      'Authenticates a user and returns a JWT access token.\n\nRate limit: 5 attempts per 15 minutes.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        emailOrPhone: {
          type: 'string',
          minLength: 1,
          maxLength: 255,
          example: 'user@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 100,
          example: 'SecurePass1!',
        },
      },
      required: ['emailOrPhone', 'password'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIs...',
        },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            rol: {
              type: 'string',
              enum: ['cliente', 'medico', 'admin'],
              example: 'cliente',
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse()
  @ApiUnauthorizedResponse()
  @ApiTooManyRequestsResponse()
  @Post('login')
  @HttpCode(200)
  @Throttle({ auth: { limit: 5, ttl: 900000 } })
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account. Requires two documents as proof of address and identity.\n\n' +
      'Rate limit: 5 attempts per 15 minutes.\n' +
      'Optional JWT required for medico/admin registration.\n' +
      'Allowed file types: application/pdf, image/jpeg, image/png.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'nuevo@example.com',
        },
        password: {
          type: 'string',
          minLength: 8,
          maxLength: 100,
          example: 'Password123',
        },
        rol: {
          type: 'string',
          enum: ['cliente', 'medico', 'admin'],
          example: 'cliente',
        },
        nombreCompleto: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          example: 'Juan Pérez',
        },
        telefono: {
          type: 'string',
          minLength: 1,
          example: '+525555555555',
        },
        telefonoSecundario: {
          type: 'string',
          example: '+525555555556',
        },
        calle: {
          type: 'string',
          minLength: 1,
          maxLength: 200,
          example: 'Av. Reforma',
        },
        numExterior: {
          type: 'string',
          maxLength: 20,
          example: '123',
        },
        numInterior: {
          type: 'string',
          maxLength: 20,
          example: 'A',
        },
        sucursalId: {
          type: 'string',
          format: 'uuid',
          example: '11111111-2222-3333-4444-555555555555',
        },
        addressDoc: {
          type: 'string',
          format: 'binary',
          description: 'Proof of address (PDF, JPG, PNG)',
        },
        identityDoc: {
          type: 'string',
          format: 'binary',
          description: 'Proof of identity (PDF, JPG, PNG)',
        },
      },
      required: [
        'email',
        'password',
        'rol',
        'nombreCompleto',
        'telefono',
        'calle',
        'sucursalId',
        'addressDoc',
        'identityDoc',
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Registration initiated',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Te enviamos un correo para continuar...',
        },
      },
    },
  })
  @ApiBadRequestResponse()
  @ApiTooManyRequestsResponse()
  @Post('register')
  @HttpCode(201)
  @Throttle({ auth: { limit: 5, ttl: 900000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'addressDoc', maxCount: 1 },
        { name: 'identityDoc', maxCount: 1 },
      ],
      {
        fileFilter: (_req, file, cb) => {
          if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(
              new BadRequestException(
                `Tipo de archivo no permitido: ${file.mimetype}`,
              ),
              false,
            );
          }
        },
      },
    ),
  )
  async register(
    @Body() body: Record<string, unknown>,
    @CurrentUser() user?: { sub: string; email: string; rol: Rol },
    @UploadedFiles()
    files?: {
      addressDoc?: Express.Multer.File[];
      identityDoc?: Express.Multer.File[];
    },
  ) {
    const parseResult = registerSchema.safeParse(body);
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

    const dto: RegisterDto = parseResult.data;

    if (!this.isRegistrationAllowed(dto.rol, user?.rol)) {
      return { message: 'Te enviamos un correo para continuar...' };
    }

    return this.authService.register(dto, {
      addressDoc: files?.addressDoc?.[0],
      identityDoc: files?.identityDoc?.[0],
    });
  }

  private isRegistrationAllowed(requestedRol: Rol, callerRol?: Rol): boolean {
    if (requestedRol === 'cliente') return true;
    if (requestedRol === 'medico') return callerRol === 'admin';
    if (requestedRol === 'admin') return callerRol === 'admin';
    return false;
  }
}
