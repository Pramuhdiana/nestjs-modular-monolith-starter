import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'ts-node prisma/seed.ts',
  },
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL ?? 'postgresql://app:app@127.0.0.1:5432/internal_app',
  },
});
