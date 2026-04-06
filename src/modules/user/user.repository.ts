import type { JenisKelamin, Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  normalizePagination,
  paginateQuery,
  type PaginationParams,
} from '../../shared/http/pagination';
import { activeWhere } from '../../shared/database/soft-delete.helper';
import { safeExecute } from '../../shared/utils/safe-execute';

/**
 * UserRepository — akses schema `users` (Profile).
 * Dipisah dari AuthRepository agar credential tidak tercampur dengan HR/profil.
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUsers(
    params: PaginationParams & {
      role?: 'admin' | 'user';
    },
  ) {
    return safeExecute(
      async () => {
        const { page, limit, search } = normalizePagination(params);
        const profileSearchWhere: Prisma.ProfileWhereInput | undefined = search
          ? activeWhere({
              fullName: { contains: search, mode: 'insensitive' as Prisma.QueryMode },
            })
          : undefined;

        const where: Prisma.UserWhereInput = activeWhere({
          ...(params.role ? { role: params.role } : {}),
          ...(search
            ? {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  {
                    profile: {
                      is: profileSearchWhere,
                    },
                  },
                ],
              }
            : {}),
        });

        return paginateQuery({
          page,
          limit,
          fetchItems: async ({ skip, take }) => {
            const rows = await this.prisma.user.findMany({
              where,
              orderBy: { id: 'asc' },
              skip,
              take,
              select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                profile: {
                  select: {
                    fullName: true,
                    // Kolom baru ikut di-select agar response list users konsisten dengan schema terbaru.
                    jenisKelamin: true,
                    isHead: true,
                    deletedAt: true,
                  },
                },
              },
            });
            return rows.map((row) => ({
              id: row.id,
              email: row.email,
              role: row.role,
              createdAt: row.createdAt,
              profile: row.profile?.deletedAt
                ? null
                : {
                    fullName: row.profile?.fullName ?? null,
                    jenisKelamin: row.profile?.jenisKelamin ?? null,
                    isHead: row.profile?.isHead ?? false,
                  },
            }));
          },
          countItems: () => this.prisma.user.count({ where }),
        });
      },
      {
        context: 'UserRepository.findUsers',
        humanMessage: 'Gagal mengambil daftar pengguna.',
      },
    );
  }

  async findProfileByUserId(userId: number) {
    return safeExecute(
      () =>
        this.prisma.profile.findFirst({
          where: activeWhere({ userId }),
          select: {
            id: true,
            userId: true,
            fullName: true,
            // Ditambahkan agar endpoint profile mengembalikan data baru tanpa query tambahan.
            jenisKelamin: true,
            isHead: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      {
        context: 'UserRepository.findProfileByUserId',
        humanMessage: 'Gagal mengambil profil pengguna.',
      },
    );
  }

  async updateProfile(
    userId: number,
    data: { fullName: string; jenisKelamin?: JenisKelamin | null; isHead?: boolean },
  ) {
    return safeExecute(
      async () => {
        await this.prisma.profile.updateMany({
          where: activeWhere({ userId }),
          data: {
            fullName: data.fullName,
            // Optional update: hanya overwrite jika field benar-benar dikirim client.
            ...(data.jenisKelamin !== undefined ? { jenisKelamin: data.jenisKelamin } : {}),
            ...(data.isHead !== undefined ? { isHead: data.isHead } : {}),
          },
        });
        return this.prisma.profile.findFirst({
          where: activeWhere({ userId }),
          select: {
            id: true,
            userId: true,
            fullName: true,
            jenisKelamin: true,
            isHead: true,
            createdAt: true,
            updatedAt: true,
          },
        });
      },
      {
        context: 'UserRepository.updateProfile',
        humanMessage: 'Gagal memperbarui profil pengguna.',
      },
    );
  }
}
