import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { MxDivisionesModule } from './mx-divisiones/mx-divisiones.module';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
