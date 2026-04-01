/**
 * Konfigurasi terpusat — KENAPA factory object:
 * - Satu bentuk typed untuk seluruh app (inject via ConfigService)
 * - Mudah di-mock di test
 * - Tidak scatter `process.env.X` di banyak file (typo-prone)
 */

function parseCorsOrigin(raw?: string): true | string[] {
  if (!raw || raw.trim() === '*') {
    return true;
  }
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : true;
}

const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    url: process.env.DATABASE_URL!,
  },
  redis: {
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  cors: {
    origin: parseCorsOrigin(process.env.CORS_ORIGIN),
  },
  throttle: {
    ttlMs: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '120', 10),
  },
});

export type AppConfig = ReturnType<typeof configuration>;

export default configuration;
