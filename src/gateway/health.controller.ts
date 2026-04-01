import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

/**
 * HealthController — dipasang di "gateway" layer agar load balancer / k8s probe
 * tidak tercampur dengan logika domain.
 */
@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness/readiness — excluded from rate limit' })
  health() {
    return { status: 'ok', service: 'modular-monolith-internal' };
  }
}
