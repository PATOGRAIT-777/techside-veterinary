import { Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { envSchema, Env } from './config/env.validation';
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
import { PagosModule } from './pagos/pagos.module';
import { HistorialMedicoModule } from './historial-medico/historial-medico.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DashboardModule } from './Dashboard/dashboard.module';
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
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        redis: configService.get('REDIS_URL', { infer: true }),
      }),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      }
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
    PagosModule,
    HistorialMedicoModule,
    DashboardModule, 
  ],
  controllers: [AppController],
  providers: [AppService, throttlerGuardProvider],
})
export class AppModule {}
