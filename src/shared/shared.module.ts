import { Global, Module } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { ErrorLogService } from './services/error-log.service';
import { RolesGuard } from './guards/roles.guard';

/**
 * SharedModule — KENAPA modul kosong bisa tetap ada:
 * - Tempat export guard/pipe/interceptor bersama saat bertambah
 * - Bisa di-import feature module yang butuh provider shared eksplisit
 */
@Global()
@Module({
  providers: [AllExceptionsFilter, TransformInterceptor, ErrorLogService, RolesGuard],
  exports: [AllExceptionsFilter, TransformInterceptor, ErrorLogService, RolesGuard],
})
export class SharedModule {}
