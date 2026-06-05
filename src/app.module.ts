import { Module, Provider } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { envSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { MxDivisionesModule } from './mx-divisiones/mx-divisiones.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PersonasModule } from './personas/personas.module';
import { ArchivosModule } from './archivos/archivos.module';
import { EmailModule } from './email/email.module';
import { CatalogosModule } from './catalogos/catalogos.module';
import { MascotasModule } from './mascotas/mascotas.module';
import { CitasModule } from './citas/citas.module';
import { MedicosModule } from './medicos/medicos.module';
import { RecetasModule } from './recetas/recetas.module';
import { ConsultasModule } from './consultas/consultas.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const throttlerGuardProvider: Provider = {
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
};

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'auth',
        ttl: 900000,
        limit: 5,
      },
    ]),
    PrismaModule,
    MxDivisionesModule,
    AuthModule,
    UsuariosModule,
    PersonasModule,
    ArchivosModule,
    EmailModule,
    CatalogosModule,
    MascotasModule,
    CitasModule,
    MedicosModule,
    RecetasModule,
    ConsultasModule,
  ],
  controllers: [AppController],
  providers: [AppService, throttlerGuardProvider],
})
export class AppModule {}
