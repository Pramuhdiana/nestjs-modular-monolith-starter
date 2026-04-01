# Modular Monolith Internal — Blueprint NestJS

Contoh fondasi **production-ready** untuk aplikasi internal perusahaan: satu proses NestJS, satu PostgreSQL, banyak **schema** per domain, Redis + BullMQ + WebSocket, dokumentasi OpenAPI, serta hardening HTTP (Helmet, CORS, rate limit) dan logging terstruktur (Pino).

> Folder ini **standalone**. Copy atau jadikan sub-repo sendiri.

## Stack tambahan (fondasi jangka panjang)

| Komponen | Fungsi |
|----------|--------|
| **Swagger UI** | Dokumentasi & coba API di `/api/docs` |
| **Helmet** | Header HTTP lebih aman (default sensibel) |
| **CORS** | Dikonfigurasi lewat `CORS_ORIGIN` (daftar origin atau `*`) |
| **Throttler** | Rate limit global per IP (`THROTTLE_TTL_MS`, `THROTTLE_LIMIT`); `/api/health` dikecualikan |
| **nestjs-pino** | Log terstruktur; `X-Request-Id` / `meta.requestId` untuk korelasi |
| **Response envelope** | Sukses: `{ success, message, data, meta }`; gagal: `{ success, message, data: null, error, meta }` |
| **Response helper reusable** | Seluruh response distandarkan via helper sukses/gagal yang human-readable |
| **DB error logs** | Error backend disimpan ke tabel `ops.error_logs` agar investigasi lebih cepat |
| **ESLint + Prettier** | `npm run lint`, `npm run format` |
| **Jest** | `npm test` (unit), `npm run test:e2e` (butuh Postgres + Redis) |

## Keputusan arsitektur (ringkas)

| Keputusan | Alasan |
|-----------|--------|
| **Modular monolith** | Satu deploy, boundary modul jelas untuk split nanti |
| **Satu DB, multi-schema** | Satu migrasi Prisma; ownership per schema (`auth`, `users`, `catalog`, `sales`) |
| **Repository per modul** | Service ringan; persistence bisa diganti terisolasi |
| **Jobs (`jobs/`)** | Side-effect async (email) lewat BullMQ |
| **WebSocket `/tracking`** | Real-time terpisah dari REST |
| **`gateway/`** | Health di pinggiran domain |

## Interaksi antar modul

| Kebutuhan | Pola | Contoh |
|-----------|------|--------|
| Transaksi sinkron | Inject repository/service modul lain | `PurchasingService` → `ProductRepository` |
| Side-effect lambat | BullMQ | `PurchasingService` → `EmailQueueService` |
| **Jangan** | Query tabel modul lain lewat Prisma mentah dari service asing | — |

## Menjalankan

```bash
cp .env.example .env
```

Isi `.env` (minimal):
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- lalu sesuaikan `DATABASE_URL` menjadi: `postgresql://USER:PASSWORD@HOST:PORT/DB_NAME`
- `JWT_SECRET`
- `SEED_MODE` (`demo` untuk local, `minimal` untuk production)

```bash
npm install
npm run doctor
npm run db:setup
npm run start:dev
```

Atau manual step-by-step:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Jika menambah model baru (contoh `ops.error_logs`), jalankan migrasi baru:

```bash
npm run prisma:migrate -- --name add_ops_error_logs
```

Untuk perubahan auth token session (login/logout revoke), jalankan migrasi:

```bash
npm run prisma:migrate -- --name add_auth_tokens
```

Untuk standar soft delete (`deleted_at`) di semua tabel, jalankan migrasi:

```bash
npm run prisma:migrate -- --name add_soft_deleted_columns
```

- **HTTP API:** `http://localhost:3000/api/...`
- **Swagger:** `http://localhost:3000/api/docs`
- **Health:** `GET http://localhost:3000/api/health` (tanpa rate limit)
- **WebSocket:** `ws://localhost:3000/tracking`

## Test

```bash
npm test                 # unit (tanpa DB)
# Nyalakan Postgres + Redis (mis. docker compose), lalu:
npm run test:e2e
```

E2e memuat default `DATABASE_URL` / `JWT_SECRET` dari `test/setup-e2e.ts` jika belum di-set; kredensial harus cocok dengan database Anda (mis. sama seperti `docker-compose.yml`).

## Preflight Check

Sebelum migrate/start, jalankan:

```bash
npm run doctor
```

`doctor` akan mengecek:
- versi Node.js
- file `.env` dan env wajib
- konektivitas Postgres (`DB_HOST:DB_PORT`)
- konektivitas Redis (`REDIS_HOST:REDIS_PORT`)

## Docker (Postgres + Redis + API)

```bash
docker compose up --build
# atau: npm run docker:up
```

- **Postgres** `localhost:5432`, **Redis** `6379`, **API** `3000`.
- Set `JWT_SECRET` di lingkungan host jika menimpa compose; lihat `docker-compose.yml`.
- **Produksi:** jalankan migrasi di CI terpisah bila memungkinkan; image hanya menjalankan binary.

## Seed data untuk uji

`npm run prisma:seed` akan mengisi data idempotent (aman dijalankan berulang).
Mode default:
- `NODE_ENV=production` => `minimal`
- selain production => `demo`

Perintah yang tersedia:
- `npm run prisma:seed:minimal`
- `npm run prisma:seed:demo`

Konten mode `demo`:
- user `admin@example.com` (role `admin`)
- user `buyer@example.com` (role `user`)
- password default keduanya: `password123`
- 3 produk demo (`DEMO-001` s/d `DEMO-003`)
- 1 order sample untuk buyer

Konten mode `minimal`:
- hanya baseline produk demo (tanpa user demo dan tanpa order sample)

## Endpoint contoh

- `POST /api/auth/register` — `{ "email", "password", "fullName" }`
- `POST /api/auth/login`
- `POST /api/auth/logout` — Bearer JWT, revoke token session saat ini
- `GET /api/auth/me` — Bearer JWT
- `GET /api/products`
- `GET /api/products?page=1&limit=20&search=demo` — siap untuk pagination/infinite scroll
- `GET /api/users?page=1&limit=20&search=mail&role=user` — list user (admin only)
- `GET /api/purchasing/orders?page=1&limit=10&search=demo&status=PENDING` — list order user untuk pagination/infinite scroll
- `POST /api/purchasing/orders` — Bearer JWT, `{ "items": [{ "productId", "quantity" }] }`

## Standar response API

Sukses:
- `success: true`
- `message`: pesan yang mudah dibaca manusia
- `data`: payload utama
- `meta`: timestamp + requestId

Gagal:
- `success: false`
- `message`: penjelasan error yang readable
- `error.statusCode`, `error.code`, `error.details`
- `meta`: timestamp + requestId

Semua exception ditangani global filter, dan detail error backend dicatat ke `ops.error_logs`.

## Role Authorization Flow (Backend-Driven)

Role **tidak boleh** dikirim FE melalui body/query/header custom.

Flow yang benar:
1. User login -> BE generate JWT berisi `{ sub, email, role }`.
2. Client kirim JWT pada header `Authorization: Bearer <token>`.
3. BE decode JWT (`JwtStrategy`) dan pasang `req.user`.
4. `RolesGuard` cek role dari `req.user.role` -> allow/reject.

Implementasi:
- `@Roles('admin')` pada endpoint yang perlu otorisasi role.
- `@UseGuards(JwtAuthGuard, RolesGuard)` untuk endpoint private by role.

## Token Session & Revoke Logout

- Saat `login/register`, BE membuat JWT dengan `jti` unik.
- `jti` token disimpan ke tabel `auth.auth_tokens`.
- Di setiap request private, `JwtStrategy` memvalidasi token masih aktif (belum revoke & belum expired).
- Saat `logout`, token saat ini di-revoke (`revoked_at` diisi), sehingga token tersebut tidak bisa dipakai lagi.

## Standar Kolom Tabel (Wajib)

Semua tabel wajib memiliki:
- `created_at`
- `updated_at`
- `deleted_at` (nullable, untuk soft delete)

Aturan query GET:
- hanya ambil data dengan `deleted_at IS NULL`
- field `deleted_at` tidak dikirim ke frontend

## Reusable Helpers

Helper untuk konsistensi dan refactor:
- `src/shared/http/api-response.ts` — format response sukses/gagal.
- `src/shared/http/pagination.ts` — normalisasi pagination + meta + `paginateQuery`.
- `src/shared/dto/pagination-query.dto.ts` — DTO query GET standar (`page`, `limit`, `search`).
- `src/shared/utils/safe-execute.ts` — wrapper try/catch reusable agar error handling seragam.
- `src/shared/services/error-log.service.ts` — simpan error backend ke DB (`ops.error_logs`).
- `src/shared/database/soft-delete.helper.ts` — helper filter aktif (`deletedAt: null`) + payload soft delete.
- `src/shared/database/soft-delete-repository.helper.ts` — helper reusable `softDeleteByWhere` / `restoreByWhere`.

Panduan lengkap membuat API baru ada di **`DEVELOPER_MANUAL.md`**.

## Catatan production

- Ganti isi `EmailProcessor` dengan provider email nyata (SMTP/SES).
- Perketat `CORS_ORIGIN` (jangan `*` di publik).
- Rotasi `JWT_SECRET` dan pertimbangkan refresh token.
- Pisahkan worker BullMQ ke proses/container terpisah jika throughput tinggi.

Lihat **`STRUCTURE.md`** untuk pohon folder berkomentar.
