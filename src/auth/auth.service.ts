import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { PersonasService } from '../personas/personas.service';
import { ArchivosService } from '../archivos/archivos.service';
import { EmailService } from '../email/email.service';
import { MxDivisionesService } from '../mx-divisiones/mx-divisiones.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { ArchivoTipo } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly personasService: PersonasService,
    private readonly archivosService: ArchivosService,
    private readonly emailService: EmailService,
    private readonly mxDivisionesService: MxDivisionesService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    user: { id: number; email: string; rol: string };
  }> {
    const user = await this.usuariosService.findByEmailOrPhone(
      dto.emailOrPhone,
    );

    if (!user || user.status !== 'activo') {
      throw new UnauthorizedException(
        'Credenciales inválidas. Inténtalo de nuevo.',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException(
        'Credenciales inválidas. Inténtalo de nuevo.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      rol: user.rol,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol,
      },
    };
  }

  async register(
    dto: RegisterDto,
    files: {
      addressDoc?: Express.Multer.File;
      identityDoc?: Express.Multer.File;
    },
  ): Promise<{ message: string }> {
    // 1. Check duplicate by email OR phone
    const existingByEmail = await this.usuariosService.findByEmailOrPhone(
      dto.email,
    );
    const existingByPhone = await this.usuariosService.findByEmailOrPhone(
      dto.telefono,
    );

    if (existingByEmail || existingByPhone) {
      this.emailService.send(
        dto.email,
        'Cuenta existente',
        'Ya tienes una cuenta. Inicia Sesión',
      );
      return { message: 'Te enviamos un correo para continuar...' };
    }

    // 2. Validate sucursalId exists and is active
    try {
      await this.mxDivisionesService.findById(dto.sucursalId);
    } catch {
      throw new BadRequestException('Sucursal no válida o inactiva');
    }

    // 3. Save files to disk
    const savedPaths: string[] = [];

    if (!files.addressDoc || !files.identityDoc) {
      throw new BadRequestException(
        'Se requieren ambos documentos: validación de dirección e identidad',
      );
    }

    const addressPath = this.archivosService.saveFile(files.addressDoc);
    savedPaths.push(addressPath);

    const identityPath = this.archivosService.saveFile(files.identityDoc);
    savedPaths.push(identityPath);

    // 4. Open Prisma transaction
    try {
      await this.prisma.$transaction(async (tx) => {
        // Create Persona
        const persona = await tx.persona.create({
          data: {
            nombreCompleto: dto.nombreCompleto,
            telefono: dto.telefono,
            telefonoSecundario: dto.telefonoSecundario,
            calle: dto.calle,
            numExterior: dto.numExterior,
            numInterior: dto.numInterior,
            sucursalId: dto.sucursalId,
          },
        });

        // Create Usuario with hashed password
        const hashedPassword = await this.usuariosService.hashPassword(
          dto.password,
        );

        const usuario = await tx.usuario.create({
          data: {
            email: dto.email,
            telefono: dto.telefono,
            passwordHash: hashedPassword,
            rol: dto.rol,
            status: 'pendiente',
            personaId: persona.id,
          },
        });

        // Create Archivo records
        await tx.archivo.create({
          data: {
            personaId: persona.id,
            tipo: ArchivoTipo.validacion_direccion,
            nombre: files.addressDoc!.originalname,
            mimeType: files.addressDoc!.mimetype,
            tamañoBytes: files.addressDoc!.size,
            ruta: addressPath,
          },
        });

        await tx.archivo.create({
          data: {
            personaId: persona.id,
            tipo: ArchivoTipo.validacion_identidad,
            nombre: files.identityDoc!.originalname,
            mimeType: files.identityDoc!.mimetype,
            tamañoBytes: files.identityDoc!.size,
            ruta: identityPath,
          },
        });

        return { persona, usuario };
      });
    } catch (error) {
      // 5. On transaction failure: delete saved files, rethrow
      for (const path of savedPaths) {
        this.archivosService.deleteFile(path);
      }
      throw error;
    }

    // 6. Send activation email
    this.emailService.send(
      dto.email,
      'Activa tu cuenta',
      'Haz clic aquí para activar tu cuenta',
    );

    // 7. Return generic message
    return { message: 'Te enviamos un correo para continuar...' };
  }
}
