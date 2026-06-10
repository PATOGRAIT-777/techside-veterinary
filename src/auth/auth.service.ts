import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ArchivosService } from '../archivos/archivos.service';
import { MxDivisionesService } from '../mx-divisiones/mx-divisiones.service';
import { PrismaService } from '../prisma/prisma.service';
import { MedicosService } from '../medicos/medicos.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { generateSecureToken } from '../common/utils/generate-token';

const BULL_QUEUE_TOKEN = 'BullQueue_email-queue';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly archivosService: ArchivosService,
    private readonly mxDivisionesService: MxDivisionesService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly medicosService: MedicosService,
    @Inject(BULL_QUEUE_TOKEN)
    private readonly emailQueue: {
      add: (name: string, data: unknown, opts?: unknown) => Promise<unknown>;
    },
  ) {}

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    user: { id: string; email: string; rol: string };
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

    // Asistencia automática para médicos
    if (user.rol === 'medico') {
      const medico = await this.prisma.medico.findFirst({
        where: { usuarioId: user.id },
      });
      if (medico) {
        await this.medicosService.registrarEntradaAutomatica(medico.id);
      }
    }

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

    if (
      existingByEmail?.status === 'activo' ||
      existingByPhone?.status === 'activo'
    ) {
      await this._enqueueAccountExistsEmail(dto.email);
      return { message: 'Te enviamos un correo para continuar...' };
    }

    if (existingByEmail?.status === 'pendiente') {
      await this._handlePendingResend(existingByEmail);
      return { message: 'Te enviamos un correo para continuar...' };
    }

    if (existingByPhone?.status === 'pendiente') {
      await this._handlePendingResend(existingByPhone);
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
    let persona: { id: string; nombreCompleto: string };
    let usuario: { id: string };

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Create Persona
        const p = await tx.persona.create({
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

        const u = await tx.usuario.create({
          data: {
            email: dto.email,
            telefono: dto.telefono,
            passwordHash: hashedPassword,
            rol: dto.rol,
            status: 'pendiente',
            personaId: p.id,
          },
        });

        // Create Archivo records
        const addressArchivo = await tx.archivo.create({
          data: {
            url: addressPath,
            nombreArchivo: files.addressDoc!.originalname,
            mime: files.addressDoc!.mimetype,
            tamano: files.addressDoc!.size,
          },
        });

        const identityArchivo = await tx.archivo.create({
          data: {
            url: identityPath,
            nombreArchivo: files.identityDoc!.originalname,
            mime: files.identityDoc!.mimetype,
            tamano: files.identityDoc!.size,
          },
        });

        // Link archivo IDs to persona
        await tx.persona.update({
          where: { id: p.id },
          data: {
            proofAddressId: addressArchivo.id,
            proofIdId: identityArchivo.id,
          },
        });

        return { persona: p, usuario: u };
      });

      persona = result.persona;
      usuario = result.usuario;
    } catch (error) {
      // 5. On transaction failure: delete saved files, rethrow
      for (const path of savedPaths) {
        this.archivosService.deleteFile(path);
      }
      throw error;
    }

    // 6. Create verification token and enqueue email
    await this._createVerificationTokenAndEnqueue(
      usuario.id,
      dto.email,
      persona.nombreCompleto,
    );

    // 7. Return generic message
    return { message: 'Te enviamos un correo para continuar...' };
  }

  private async _createVerificationTokenAndEnqueue(
    usuarioId: string,
    email: string,
    userName: string,
  ): Promise<void> {
    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await this.prisma.emailVerificationToken.create({
      data: {
        usuarioId,
        token,
        expiresAt,
      },
    });

    await this.emailQueue.add(
      'send-verification',
      { to: email, userName, token },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }

  private async _handlePendingResend(usuario: {
    id: string;
    email: string;
    persona: { nombreCompleto: string };
  }): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        usuarioId: usuario.id,
        usedAt: null,
      },
    });

    await this._createVerificationTokenAndEnqueue(
      usuario.id,
      usuario.email,
      usuario.persona.nombreCompleto,
    );
  }

  private async _enqueueAccountExistsEmail(email: string): Promise<void> {
    await this.emailQueue.add(
      'send-account-exists',
      { to: email },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const now = new Date();

    // Atomic consumption: only succeeds if token is valid, unused, and not expired
    const updateResult = await this.prisma.emailVerificationToken.updateMany({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (updateResult.count === 0) {
      throw new BadRequestException(
        'El enlace de verificación es inválido, ha expirado o ya fue utilizado.',
      );
    }

    // Retrieve the consumed token to know which user to activate
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    await this.prisma.usuario.update({
      where: { id: tokenRecord!.usuarioId },
      data: { status: 'activo' },
    });

    return { message: 'Tu cuenta ha sido activada exitosamente.' };
  }

  async resendConfirmation(dto: {
    email: string;
  }): Promise<{ message: string }> {
    const user = await this.usuariosService.findByEmailOrPhone(dto.email);

    if (!user || user.status !== 'pendiente') {
      return { message: 'Te enviamos un correo para continuar...' };
    }

    await this.prisma.emailVerificationToken.deleteMany({
      where: {
        usuarioId: user.id,
        usedAt: null,
      },
    });

    await this._createVerificationTokenAndEnqueue(
      user.id,
      user.email,
      user.persona.nombreCompleto,
    );

    return { message: 'Te enviamos un correo para continuar...' };
  }
}
