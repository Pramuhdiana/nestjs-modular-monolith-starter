import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Global DatabaseModule — KENAPA @Global:
 * - Hampir semua modul butuh DB; hindari import DatabaseModule di setiap feature module
 * - Tetap satu provider PrismaService (singleton)
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
