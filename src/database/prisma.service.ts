import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService — KENAPA extend PrismaClient langsung:
 * - Satu client per app = satu connection pool (efisien)
 * - Lifecycle hook: connect/disconnect bersih saat shutdown (hindari leak di hot-reload / k8s)
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
