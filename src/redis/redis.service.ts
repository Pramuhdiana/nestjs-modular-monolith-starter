import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppConfig } from '../config/configuration';

/**
 * RedisService — KENAPA ada layer tipis di atas ioredis:
 * - Session/cache key prefix konsisten
 * - Ganti implementasi (Valkey, cluster) tanpa sentuh consumer
 * - Mock mudah di unit test
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const redis = this.config.get('redis', { infer: true });
    this.client = new Redis({
      host: redis.host,
      port: redis.port,
      password: redis.password,
      maxRetriesPerRequest: 3,
    });
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
