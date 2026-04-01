import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../../../config/configuration';
import { AuthRepository } from '../auth.repository';

export type JwtPayload = { sub: number; email: string; role: string; jti: string };

/**
 * JwtStrategy — KENAPA Passport strategy:
 * - Pola standar Nest untuk protect route; guard reusable
 * - `validate` mengembalikan object yang dipasang ke `req.user`
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<AppConfig, true>,
    private readonly authRepo: AuthRepository,
  ) {
    const jwt = config.get('jwt', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
    });
  }

  async validate(payload: JwtPayload) {
    const activeToken = await this.authRepo.findActiveTokenByJti(payload.jti);
    if (!activeToken) {
      throw new UnauthorizedException('Sesi token sudah tidak aktif. Silakan login kembali.');
    }
    return { userId: payload.sub, email: payload.email, role: payload.role, tokenId: payload.jti };
  }
}
