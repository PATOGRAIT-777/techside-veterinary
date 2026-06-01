import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { MxDivisionesModule } from './mx-divisiones/mx-divisiones.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PersonasModule } from './personas/personas.module';
import { ArchivosModule } from './archivos/archivos.module';
import { EmailModule } from './email/email.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    PrismaModule,
    MxDivisionesModule,
    AuthModule,
    UsuariosModule,
    PersonasModule,
    ArchivosModule,
    EmailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
