import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

type JwtRequestUser = {
  userId: number;
  email: string;
  role: string;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtRequestUser }>();
    const userRole = request.user?.role;

    if (!userRole) {
      throw new ForbiddenException('Role pengguna tidak ditemukan pada token.');
    }

    const allowed = requiredRoles.includes(userRole);
    if (!allowed) {
      throw new ForbiddenException('Anda tidak memiliki akses untuk resource ini.');
    }

    return true;
  }
}
