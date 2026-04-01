import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — KENAPA thin wrapper:
 * - Nama domain di guard (`jwt`) tetap di strategy; controller cukup `@UseGuards(JwtAuthGuard)`
 * - Mudah diganti (mis. combined guard) tanpa ubah banyak controller
 */
export class JwtAuthGuard extends AuthGuard('jwt') {}
