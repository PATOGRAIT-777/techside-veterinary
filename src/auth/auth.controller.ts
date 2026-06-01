import {
  Controller,
  Post,
  Body,
  UsePipes,
  HttpCode,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { loginSchema } from './dto/login.dto';
import type { LoginDto } from './dto/login.dto';
import { registerSchema } from './dto/register.dto';
import type { RegisterDto } from './dto/register.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

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
    @UploadedFiles()
    files: {
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

    return this.authService.register(dto, {
      addressDoc: files.addressDoc?.[0],
      identityDoc: files.identityDoc?.[0],
    });
  }
}
