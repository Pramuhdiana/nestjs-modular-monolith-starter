import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { AppConfig } from './config/configuration';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

/**
 * HTTP middleware, validation, envelope, dan Swagger — satu tempat untuk main + e2e.
 */
export function applyHttpGlobals(app: INestApplication) {
  const config = app.get(ConfigService<AppConfig, true>);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'style-src': ["'self'", "'unsafe-inline'"],
          'script-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", 'data:', 'https:'],
        },
      },
    }),
  );
  app.enableCors({
    origin: config.get('cors', { infer: true }).origin,
    credentials: true,
  });

  app.setGlobalPrefix('api');
  app.useGlobalFilters(app.get(AllExceptionsFilter));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(app.get(TransformInterceptor));

  const swagger = new DocumentBuilder()
    .setTitle('Modular Monolith API')
    .setDescription('REST — auth, users, catalog, purchasing (internal blueprint).')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, document);
}
