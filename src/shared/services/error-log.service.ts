import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ErrorLogService {
  private readonly logger = new Logger(ErrorLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logError(payload: {
    requestId: string | null;
    method?: string;
    path?: string;
    statusCode: number;
    message: string;
    code?: string;
    details?: unknown;
    stack?: string;
    requestBody?: unknown;
  }) {
    try {
      await this.prisma.errorLog.create({
        data: {
          source: 'api',
          requestId: payload.requestId ?? undefined,
          method: payload.method,
          path: payload.path,
          statusCode: payload.statusCode,
          errorCode: payload.code,
          message: payload.message,
          details: payload.details as Prisma.InputJsonValue | undefined,
          stack: payload.stack,
          payload: payload.requestBody as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown log write error';
      this.logger.error(`Failed to persist error log: ${message}`);
    }
  }
}
