import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { OrderEmailJob } from './email-queue.service';

/**
 * Worker email — KENAPA class terpisah:
 * - Bisa di-scale horizontal (lebih banyak replica worker) tanpa scale API
 * - Gagal tidak memblok request HTTP user
 *
 * Di production: ganti isi process() dengan nodemailer / SES / SendGrid.
 */
@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<OrderEmailJob>): Promise<void> {
    const { to, subject, text } = job.data;
    this.logger.log(`[would send email] to=${to} subject=${subject} job=${job.id}`);
    this.logger.debug(text);
  }
}
