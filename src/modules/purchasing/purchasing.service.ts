import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { AuthRepository } from '../auth/auth.repository';
import { ProductRepository } from '../product/product.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { PurchasingRepository } from './purchasing.repository';
import { EmailQueueService } from '../../jobs/email/email-queue.service';
import { safeExecute } from '../../shared/utils/safe-execute';

/**
 * PurchasingService — contoh interaksi antar modul:
 * - ProductRepository: validasi harga & stok logis (di sini minimal: produk aktif)
 * - AuthRepository: ambil email untuk notifikasi (bisa diganti UserService)
 * - EmailQueueService: side-effect async (email) lewat BullMQ, bukan import langsung SMTP
 */
@Injectable()
export class PurchasingService {
  constructor(
    private readonly purchasing: PurchasingRepository,
    private readonly products: ProductRepository,
    private readonly auth: AuthRepository,
    private readonly emailQueue: EmailQueueService,
  ) {}

  async listOrders(userId: number, query: ListOrdersQueryDto) {
    return safeExecute(
      () =>
        this.purchasing.findOrdersByUser(userId, {
          page: query.page,
          limit: query.limit,
          search: query.search,
          status: query.status,
        }),
      {
        context: 'PurchasingService.listOrders',
        humanMessage: 'Gagal mengambil daftar pesanan.',
      },
    );
  }

  async createOrder(userId: number, dto: CreateOrderDto) {
    return safeExecute(
      async () => {
        const lines: { productId: number; quantity: number; unitPriceCents: number }[] = [];
        let totalCents = 0;

        for (const item of dto.items) {
          const product = await this.products.findActiveById(item.productId);
          if (!product) {
            throw new BadRequestException(`Produk dengan ID ${item.productId} tidak tersedia.`);
          }
          const lineTotal = product.priceCents * item.quantity;
          totalCents += lineTotal;
          lines.push({
            productId: product.id,
            quantity: item.quantity,
            unitPriceCents: product.priceCents,
          });
        }

        const order = await this.purchasing.createOrderWithItems({
          userId,
          totalCents,
          lines,
        });

        if (!order) {
          throw new InternalServerErrorException('Pembuatan pesanan gagal.');
        }

        const user = await this.auth.findById(userId);
        if (user) {
          await this.emailQueue.enqueueOrderConfirmation(user.email, order.id);
        }

        return order;
      },
      {
        context: 'PurchasingService.createOrder',
        humanMessage: 'Gagal membuat pesanan.',
      },
    );
  }
}
