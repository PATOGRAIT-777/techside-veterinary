import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PersonasModule } from '../personas/personas.module';
import { ArchivosModule } from '../archivos/archivos.module';
import { EmailModule } from '../email/email.module';
import { MxDivisionesModule } from '../mx-divisiones/mx-divisiones.module';
import { Env } from '../config/env.validation';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        secret: configService.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
    UsuariosModule,
    PersonasModule,
    ArchivosModule,
    EmailModule,
    MxDivisionesModule,
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
