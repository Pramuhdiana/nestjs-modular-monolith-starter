import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * GatewayModule — di monolith ini = modul entry HTTP tambahan (health, nanti rate-limit).
 * Route domain tetap di modules/*; pola ini memudahkan split ke reverse proxy murni nanti.
 */
@Module({
  controllers: [HealthController],
})
export class GatewayModule {}
