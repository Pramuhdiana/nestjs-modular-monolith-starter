import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { activeWhere } from '../../shared/database/soft-delete.helper';
import { safeExecute } from '../../shared/utils/safe-execute';

/**
 * AuthRepository — KENAPA layer repository untuk auth schema:
 * - Query `auth` schema terkumpul; service tetap readable
 * - Ganti ORM nanti lebih terisolasi (jarang, tapi boundary jelas)
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return safeExecute(
      () =>
        this.prisma.user.findFirst({
          where: activeWhere({ email }),
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true,
          },
        }),
      {
        context: 'AuthRepository.findByEmail',
        humanMessage: 'Gagal mengambil data pengguna.',
      },
    );
  }

  async findById(id: number) {
    return safeExecute(
      () =>
        this.prisma.user.findFirst({
          where: activeWhere({ id }),
          select: {
            id: true,
            email: true,
            role: true,
          },
        }),
      {
        context: 'AuthRepository.findById',
        humanMessage: 'Gagal mengambil data pengguna.',
      },
    );
  }

  async createUserWithProfile(data: { email: string; passwordHash: string; fullName: string }) {
    return safeExecute(
      () =>
        this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { email: data.email, passwordHash: data.passwordHash, role: 'user' },
          });
          await tx.profile.create({
            data: { userId: user.id, fullName: data.fullName },
          });
          return { id: user.id, email: user.email, role: user.role };
        }),
      {
        context: 'AuthRepository.createUserWithProfile',
        humanMessage: 'Gagal membuat akun pengguna.',
      },
    );
  }

  async saveAuthToken(data: { userId: number; jti: string; expiresAt: Date }) {
    return safeExecute(
      () =>
        this.prisma.authToken.create({
          data: {
            userId: data.userId,
            jti: data.jti,
            expiresAt: data.expiresAt,
          },
        }),
      {
        context: 'AuthRepository.saveAuthToken',
        humanMessage: 'Gagal menyimpan sesi token.',
      },
    );
  }

  async findActiveTokenByJti(jti: string) {
    return safeExecute(
      () =>
        this.prisma.authToken.findFirst({
          where: {
            jti,
            ...activeWhere(),
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
      {
        context: 'AuthRepository.findActiveTokenByJti',
        humanMessage: 'Gagal memvalidasi token.',
      },
    );
  }

  async revokeTokenByJti(jti: string) {
    return safeExecute(
      () =>
        this.prisma.authToken.updateMany({
          where: { ...activeWhere({ jti }), revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      {
        context: 'AuthRepository.revokeTokenByJti',
        humanMessage: 'Gagal melakukan logout.',
      },
    );
  }
}
