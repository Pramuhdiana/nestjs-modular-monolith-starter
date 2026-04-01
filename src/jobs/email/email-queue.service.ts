import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

export type OrderEmailJob = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Producer antrian email — KENAPA service terpisah dari processor:
 * - Domain (purchasing) hanya tahu "kirim email konfirmasi", tidak tahu SMTP/SendGrid
 * - Retry/backoff dikonfigurasi di worker, bukan di HTTP request
 */
@Injectable()
export class EmailQueueService {
  constructor(@InjectQueue('email') private readonly emailQueue: Queue) {}

  async enqueueOrderConfirmation(to: string, orderId: number) {
    const payload: OrderEmailJob = {
      to,
      subject: `Order #${orderId} received`,
      text: `Your order #${orderId} has been recorded. You will receive updates here.`,
    };
    await this.emailQueue.add('order-confirmation', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
    });
  }
}
