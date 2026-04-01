# Struktur folder — Modular Monolith NestJS (penjelasan per folder)

Dokumen ini menjelaskan **KENAPA** setiap bagian ada, bukan hanya isinya.

```
modular-monolith-internal/
├── README.md
├── STRUCTURE.md
├── package.json
├── tsconfig.json
├── tsconfig.build.json               # Exclude test/spec dari output `nest build`
├── nest-cli.json
├── jest.config.js
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── .env.example
│
├── test/
│   ├── jest-e2e.json
│   ├── jest-setup-unit.ts           # reflect-metadata untuk Jest + class-transformer
│   ├── setup-e2e.ts                 # Default env e2e + reflect-metadata
│   └── app.e2e-spec.ts
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── src/
    ├── main.ts                        # Bootstrap: Pino logger, listen, log URL Swagger
    ├── app.module.ts                  # Root: Config, Pino, Throttler, Bull, domain modules
    ├── app.http-global.ts             # Helmet, CORS, prefix `api`, pipes, interceptor, filter, Swagger
    │
    ├── types/
    │   └── express.d.ts               # Request.id (pino-http)
    │
    ├── config/
    │   ├── configuration.ts           # Factory typed + CORS + throttle
    │   └── env.validation.ts          # Fail-fast env (class-validator)
    │
    ├── database/
    │   ├── database.module.ts
    │   └── prisma.service.ts
    │
    ├── shared/
    │   ├── shared.module.ts
    │   ├── decorators/
    │   ├── guards/
    │   ├── interceptors/              # Envelope sukses + requestId
    │   └── filters/                   # Envelope error konsisten
    │
    ├── gateway/
    │   ├── gateway.module.ts
    │   └── health.controller.ts       # @SkipThrottle()
    │
    ├── modules/
    │   ├── auth/
    │   ├── user/
    │   ├── product/
    │   └── purchasing/
    │
    ├── jobs/
    │   ├── jobs.module.ts
    │   └── email/
    │       ├── email-queue.service.ts
    │       └── email.processor.ts
    │
    └── websocket/
        ├── websocket.module.ts
        └── tracking.gateway.ts
```

## Kapan import service langsung vs BullMQ?

| Situasi | Pola | Alasan |
|--------|------|--------|
| Butuh jawaban di request yang sama | Inject service/repository modul lain | Konsistensi, error sinkron |
| Operasi lambat (email, PDF) | BullMQ | Tidak blok user; retry |
| Anti-pattern | Modul A query tabel B lewat Prisma di luar repo publik | Rusak batas konteks |

## Satu database, banyak schema PostgreSQL

- Satu `DATABASE_URL`, satu riwayat migrasi Prisma.
- Schema (`auth`, `users`, …) memisahkan ownership logis — memudahkan evolusi menuju split DB.
