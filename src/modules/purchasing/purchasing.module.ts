import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductModule } from '../product/product.module';
import { JobsModule } from '../../jobs/jobs.module';
import { PurchasingController } from './purchasing.controller';
import { PurchasingRepository } from './purchasing.repository';
import { PurchasingService } from './purchasing.service';

@Module({
  imports: [ProductModule, AuthModule, JobsModule],
  controllers: [PurchasingController],
  providers: [PurchasingService, PurchasingRepository],
})
export class PurchasingModule {}
