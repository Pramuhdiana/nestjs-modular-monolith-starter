import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  normalizePagination,
  paginateQuery,
  type PaginationParams,
} from '../../shared/http/pagination';
import { activeWhere } from '../../shared/database/soft-delete.helper';
import {
  restoreByWhere,
  softDeleteByWhere,
} from '../../shared/database/soft-delete-repository.helper';
import { safeExecute } from '../../shared/utils/safe-execute';

@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyActive(params: PaginationParams) {
    return safeExecute(
      async () => {
        const { page, limit, search } = normalizePagination(params);

        const where: Prisma.ProductWhereInput = activeWhere({
          active: true,
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { sku: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        });

        return paginateQuery({
          page,
          limit,
          fetchItems: ({ skip, take }) =>
            this.prisma.product.findMany({
              where,
              orderBy: { id: 'asc' },
              skip,
              take,
              select: {
                id: true,
                sku: true,
                name: true,
                description: true,
                priceCents: true,
                active: true,
                createdAt: true,
                updatedAt: true,
              },
            }),
          countItems: () => this.prisma.product.count({ where }),
        });
      },
      {
        context: 'ProductRepository.findManyActive',
        humanMessage: 'Gagal mengambil data produk aktif.',
      },
    );
  }

  async findActiveById(id: number) {
    return safeExecute(
      () =>
        this.prisma.product.findFirst({
          where: activeWhere({ id, active: true }),
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            priceCents: true,
            active: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      {
        context: 'ProductRepository.findActiveById',
        humanMessage: 'Gagal mencari data produk.',
      },
    );
  }

  async softDeleteById(id: number) {
    return safeExecute(
      () => softDeleteByWhere((args) => this.prisma.product.updateMany(args), { id }),
      {
        context: 'ProductRepository.softDeleteById',
        humanMessage: 'Gagal melakukan soft delete produk.',
      },
    );
  }

  async restoreById(id: number) {
    return safeExecute(
      () => restoreByWhere((args) => this.prisma.product.updateMany(args), { id }),
      {
        context: 'ProductRepository.restoreById',
        humanMessage: 'Gagal melakukan restore produk.',
      },
    );
  }
}
