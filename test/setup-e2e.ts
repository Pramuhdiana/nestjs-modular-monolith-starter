import 'reflect-metadata';

/**
 * Defaults untuk `npm run test:e2e` lokal — samakan dengan docker-compose postgres/redis.
 * Override dengan variabel lingkungan nyata di CI.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://app:app@127.0.0.1:5432/internal_app';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'e2e-test-secret-min-32-chars-long!!';
}
