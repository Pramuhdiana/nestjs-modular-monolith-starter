import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { successResponse } from '../http/api-response';

/**
 * Response envelope konsisten — KENAPA:
 * - FE/internal client bisa parse seragam { data, meta }
 * - `requestId` dari pino-http untuk trace log ↔ response
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request.id != null ? String(request.id) : null;
    return next.handle().pipe(
      map((data) =>
        successResponse({
          data,
          requestId,
        }),
      ),
    );
  }
}
