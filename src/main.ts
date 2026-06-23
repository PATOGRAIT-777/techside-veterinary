import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { Env } from './config/env.validation';
import {
  CORS_ALLOWED_HEADERS,
  CORS_METHODS,
  resolveCorsOrigin,
} from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService<Env, true>);

  const frontendUrl = configService.get('FRONTEND_URL', { infer: true });
  const nodeEnv = configService.get('NODE_ENV', { infer: true });

  // Global middlewares & interceptors
  app.enableCors({
    origin: resolveCorsOrigin(frontendUrl, nodeEnv),
    methods: CORS_METHODS,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    credentials: false,
  });
app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );  app.useGlobalInterceptors(new SanitizeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Serve static assets for custom Swagger branding
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Exponer la carpeta uploads para poder ver las fotos de las mascotas
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  // Swagger — disabled in production
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Techside Veterinary API')
      .setDescription(
        'Interactive API documentation for the Techside Veterinary platform.',
      )
      .setVersion(process.env.npm_package_version ?? '0.0.1')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Enter JWT Bearer token only (no "Bearer" prefix needed).',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customCssUrl: '/swagger-custom.css',
      customSiteTitle: 'Techside Veterinary API Docs',
      customfavIcon: '/swagger-favicon.png',
    });
  }

  await app.listen(configService.get('PORT', { infer: true }) ?? 3000);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
