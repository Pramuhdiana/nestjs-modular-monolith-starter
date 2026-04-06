import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRepository } from '../user/user.repository';
import { AuthRepository } from './auth.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { safeExecute } from '../../shared/utils/safe-execute';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly users: UserRepository,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    return safeExecute(
      async () => {
        const existing = await this.authRepo.findByEmail(dto.email);
        if (existing) {
          throw new ConflictException('Email sudah terdaftar.');
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);

        const user = await this.authRepo.createUserWithProfile({
          email: dto.email,
          passwordHash,
          fullName: dto.fullName,
          // Forward field baru ke repository supaya saat register tidak perlu patch profile ulang.
          jenisKelamin: dto.jenisKelamin,
          isHead: dto.isHead,
        });

        return this.buildTokenResponse(user.id, user.email, user.role);
      },
      {
        context: 'AuthService.register',
        humanMessage: 'Registrasi gagal diproses.',
      },
    );
  }

  async login(dto: LoginDto) {
    return safeExecute(
      async () => {
        const user = await this.authRepo.findByEmail(dto.email);
        if (!user) {
          throw new UnauthorizedException('Email atau password tidak valid.');
        }
        const ok = await bcrypt.compare(dto.password, user.passwordHash);
        if (!ok) {
          throw new UnauthorizedException('Email atau password tidak valid.');
        }
        return this.buildTokenResponse(user.id, user.email, user.role);
      },
      {
        context: 'AuthService.login',
        humanMessage: 'Login gagal diproses.',
      },
    );
  }

  private async buildTokenResponse(userId: number, email: string, role: string) {
    const jti = randomUUID();
    const access_token = this.jwt.sign({ sub: userId, email, role, jti });
    const decoded = this.jwt.decode(access_token) as { exp?: number } | null;
    if (!decoded?.exp) {
      throw new UnauthorizedException('Token tidak valid.');
    }
    await this.authRepo.saveAuthToken({
      userId,
      jti,
      expiresAt: new Date(decoded.exp * 1000),
    });
    return {
      access_token,
      token_type: 'Bearer' as const,
    };
  }

  async logout(tokenId: string) {
    return safeExecute(
      async () => {
        if (!tokenId) {
          throw new UnauthorizedException('Token tidak ditemukan.');
        }
        await this.authRepo.revokeTokenByJti(tokenId);
        return { loggedOut: true };
      },
      {
        context: 'AuthService.logout',
        humanMessage: 'Logout gagal diproses.',
      },
    );
  }

  async me(userId: number) {
    return safeExecute(
      async () => {
        const user = await this.authRepo.findById(userId);
        if (!user) {
          throw new UnauthorizedException('Akun pengguna tidak ditemukan.');
        }
        const profile = await this.users.findProfileByUserId(userId);
        return {
          id: user.id,
          email: user.email,
          role: user.role,
          // Ditambahkan agar endpoint /auth/me merefleksikan shape profile terbaru.
          profile: profile
            ? {
                fullName: profile.fullName,
                jenisKelamin: profile.jenisKelamin,
                isHead: profile.isHead,
              }
            : null,
        };
      },
      {
        context: 'AuthService.me',
        humanMessage: 'Gagal mengambil data profil pengguna.',
      },
    );
  }
}
