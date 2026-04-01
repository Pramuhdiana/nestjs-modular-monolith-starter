import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { errorResponse } from '../http/api-response';
import { ErrorLogService } from '../services/error-log.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  constructor(private readonly errorLogs: ErrorLogService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.id != null ? String(request.id) : null;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Terjadi kesalahan pada server. Silakan coba lagi.';
    let details: unknown;
    let code: string | undefined;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null && 'message' in res) {
        const payload = res as { message: string | string[]; error?: string; code?: string };
        message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message;
        details = payload.error;
        code = payload.code;
      }
    } else if (exception instanceof Error) {
      stack = exception.stack;
      message = 'Terjadi kesalahan pada server. Tim kami sudah mencatat masalah ini.';
      this.logger.error(exception.stack ?? exception.message, { requestId });
    }

    await this.errorLogs.logError({
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
      statusCode: status,
      message,
      code,
      details,
      stack,
      requestBody: request.body,
    });

    response.status(status).json(
      errorResponse({
        statusCode: status,
        requestId,
        message,
        code,
        details,
      }),
    );
  }
}
