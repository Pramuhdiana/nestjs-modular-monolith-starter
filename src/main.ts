import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { applyHttpGlobals } from './app.http-global';
import type { AppConfig } from './config/configuration';
import { ConfigService } from '@nestjs/config';

/**
 * Bootstrap — KENAPA global prefix `api`:
 * - Satu konvensi untuk reverse proxy / API gateway di depan
 * - Memisahkan route aplikasi dari health/metrics jika ditambah nanti
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  applyHttpGlobals(app);

  const config = app.get(ConfigService<AppConfig, true>);
  const port = config.get('port', { infer: true });
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`HTTP listening on port ${port} — Swagger UI: http://localhost:${port}/api/docs`);
}

void bootstrap();
