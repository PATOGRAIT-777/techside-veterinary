import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global middlewares & interceptors
  app.use(helmet());
  app.useGlobalInterceptors(new SanitizeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Serve static assets for custom Swagger branding
  app.useStaticAssets(join(process.cwd(), 'public'));

  // Swagger — disabled in production
  if (process.env.NODE_ENV !== 'production') {
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

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
