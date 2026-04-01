import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type RequestUser = { userId: number; email: string; role: string; tokenId: string };

/**
 * @CurrentUser() — KENAPA custom decorator:
 * - Hindari duplikasi `req.user` casting di tiap controller
 * - Satu titik jika shape user dari JWT berubah
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
