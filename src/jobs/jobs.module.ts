import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EmailProcessor } from './email/email.processor';
import { EmailQueueService } from './email/email-queue.service';

/**
 * JobsModule — KENAPA terpisah dari domain:
 * - Background work punya lifecycle & scaling berbeda dari REST
 * - Satu tempat daftar queue & processor (audit mudah)
 */
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [EmailProcessor, EmailQueueService],
  exports: [BullModule, EmailQueueService],
})
export class JobsModule {}
