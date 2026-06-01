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
import { Rol } from '@prisma/client';
import { AuthService } from './auth.service';
import { loginSchema } from './dto/login.dto';
import type { LoginDto } from './dto/login.dto';
import { registerSchema } from './dto/register.dto';
import type { RegisterDto } from './dto/register.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(loginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  @HttpCode(201)
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
    @CurrentUser() user?: { sub: number; email: string; rol: Rol },
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
