import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { randomUUID } from 'crypto';
import { LoggerModule } from 'nestjs-pino';
import configuration, { AppConfig } from './config/configuration';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { JobsModule } from './jobs/jobs.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { GatewayModule } from './gateway/gateway.module';
import { WebsocketModule } from './websocket/websocket.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const isProd = config.get('nodeEnv', { infer: true }) === 'production';
        return {
          pinoHttp: {
            level: isProd ? 'info' : 'debug',
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: { singleLine: true, colorize: true },
                },
            genReqId: (req, res) => {
              const header = req.headers['x-request-id'];
              const id = typeof header === 'string' && header.length > 0 ? header : randomUUID();
              res.setHeader('X-Request-Id', id);
              return id;
            },
            customProps: (req) => ({ requestId: req.id }),
          },
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const throttle = config.get('throttle', { infer: true });
        return {
          throttlers: [{ ttl: throttle.ttlMs, limit: throttle.limit }],
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        connection: {
          host: config.get('redis', { infer: true }).host,
          port: config.get('redis', { infer: true }).port,
          password: config.get('redis', { infer: true }).password,
        },
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    RedisModule,
    JobsModule,
    AuthModule,
    UserModule,
    ProductModule,
    PurchasingModule,
    GatewayModule,
    WebsocketModule,
    SharedModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
