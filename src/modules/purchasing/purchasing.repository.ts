import type { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  normalizePagination,
  paginateQuery,
  type PaginationParams,
} from '../../shared/http/pagination';
import { activeWhere } from '../../shared/database/soft-delete.helper';
import { safeExecute } from '../../shared/utils/safe-execute';

@Injectable()
export class PurchasingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrdersByUser(
    userId: number,
    params: PaginationParams & {
      status?: 'PENDING' | 'PAID' | 'CANCELLED';
    },
  ) {
    return safeExecute(
      async () => {
        const { page, limit, search } = normalizePagination(params);
        const searchFilters: Prisma.OrderWhereInput[] = [];
        if (search) {
          const parsedOrderId = Number(search);
          if (!Number.isNaN(parsedOrderId)) {
            searchFilters.push({ id: parsedOrderId });
          }
          searchFilters.push({
            items: {
              some: {
                product: {
                  ...activeWhere(),
                  OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                  ],
                },
              },
            },
          });
        }

        const where: Prisma.OrderWhereInput = activeWhere({
          userId,
          ...(params.status ? { status: params.status } : {}),
          ...(searchFilters.length > 0 ? { OR: searchFilters } : {}),
        });

        return paginateQuery({
          page,
          limit,
          fetchItems: ({ skip, take }) =>
            this.prisma.order.findMany({
              where,
              orderBy: { id: 'desc' },
              skip,
              take,
              include: {
                items: {
                  where: activeWhere({
                    product: activeWhere(),
                  }),
                  include: {
                    product: { select: { id: true, sku: true, name: true } },
                  },
                },
              },
            }),
          countItems: () => this.prisma.order.count({ where }),
        });
      },
      {
        context: 'PurchasingRepository.findOrdersByUser',
        humanMessage: 'Gagal mengambil daftar pesanan.',
      },
    );
  }

  async createOrderWithItems(params: {
    userId: number;
    totalCents: number;
    lines: { productId: number; quantity: number; unitPriceCents: number }[];
  }) {
    return safeExecute(
      () =>
        this.prisma.$transaction(async (tx) => {
          const order = await tx.order.create({
            data: {
              userId: params.userId,
              totalCents: params.totalCents,
              status: 'PENDING',
            },
          });
          for (const line of params.lines) {
            await tx.orderItem.create({
              data: {
                orderId: order.id,
                productId: line.productId,
                quantity: line.quantity,
                unitPriceCents: line.unitPriceCents,
              },
            });
          }
          return tx.order.findUnique({
            where: { id: order.id },
            include: {
              items: {
                where: activeWhere(),
              },
              user: { select: { id: true, email: true } },
            },
          });
        }),
      {
        context: 'PurchasingRepository.createOrderWithItems',
        humanMessage: 'Gagal membuat pesanan.',
      },
    );
  }
}
