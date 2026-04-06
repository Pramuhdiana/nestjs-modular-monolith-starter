# Developer Manual — API Consistency Guide

Panduan ini menjadi standar tim agar setiap API baru konsisten, mudah dirawat, dan aman untuk jangka panjang.

## 1) Prinsip Wajib

- Gunakan pola `controller -> service -> repository`.
- Semua akses DB lewat repository.
- Gunakan `safeExecute(...)` pada service/repository.
- Gunakan DTO + validator (`class-validator`) pada request.
- Gunakan response global (jangan format manual di controller).
- Error harus human-readable dan otomatis tercatat ke `ops.error_logs`.
- Role authorization wajib dibaca dari JWT (`req.user.role`), bukan dari payload FE.

## 2) Struktur Folder API Baru

Contoh menambah modul `inventory`:

```text
src/modules/inventory/
  inventory.module.ts
  inventory.controller.ts
  inventory.service.ts
  inventory.repository.ts
  dto/
    create-inventory.dto.ts
    update-inventory.dto.ts
    list-inventory.query.dto.ts
```

## 3) Langkah Buat API Baru (Checklist)

1. **Desain model data**
   - Tambah model di `prisma/schema.prisma`.
   - Tentukan schema domain (`@@schema("...")`) dan index penting.
   - Wajib tambah kolom:
     - `createdAt DateTime @default(now()) @map("created_at")`
     - `updatedAt DateTime @updatedAt @map("updated_at")`
     - `deletedAt DateTime? @map("deleted_at")`

2. **Migration**
   - Jalankan `npm run doctor` dulu untuk preflight check env & service.
   - `npm run prisma:generate`
   - `npm run prisma:migrate -- --name your_migration_name`

### 3.1) Cara Menambah Kolom Baru (Wajib Ikuti)

Contoh kasus: menambah `jenis_kelamin` (enum) dan `is_head` (boolean) pada `users.profiles`.

1. **Update schema Prisma**

```prisma
model Profile {
  id           Int           @id @default(autoincrement())
  userId       Int           @unique @map("user_id")
  fullName     String        @map("full_name")
  jenisKelamin JenisKelamin? @map("jenis_kelamin")
  isHead       Boolean       @default(false) @map("is_head")
  createdAt    DateTime      @default(now()) @map("created_at")
  updatedAt    DateTime      @updatedAt @map("updated_at")
  deletedAt    DateTime?     @map("deleted_at")

  @@map("profiles")
  @@schema("users")
}

enum JenisKelamin {
  LAKI_LAKI
  PEREMPUAN

  @@schema("users")
}
```

2. **Buat migration (jangan edit DB manual)**

```bash
npm run prisma:generate
npx prisma migrate dev --name add_profile_gender_is_head
```

3. **Jika perlu metadata DB, tambah komentar di migration SQL**

```sql
COMMENT ON TYPE "users"."JenisKelamin" IS 'Enum jenis kelamin yang diizinkan: LAKI_LAKI, PEREMPUAN.';
COMMENT ON COLUMN "users"."profiles"."jenis_kelamin" IS 'Jenis kelamin profile.';
COMMENT ON COLUMN "users"."profiles"."is_head" IS 'Penanda kepala unit / PIC.';
```

4. **Update DTO (request contract)**

```ts
@IsOptional()
@IsEnum(JenisKelamin)
jenisKelamin?: JenisKelamin;

@IsOptional()
@IsBoolean()
isHead?: boolean;
```

5. **Update repository/service (persist + response)**
   - Tambah field baru di `create/update`.
   - Tambah field baru di `select` agar response sinkron.
   - Untuk partial update, hanya update field yang dikirim request.

6. **Update seed**
   - Isi contoh data valid enum/boolean agar developer baru langsung paham format data.

7. **Verifikasi**

```bash
npm run build
npm run prisma:seed
```

Checklist cepat sebelum PR:
- [ ] Schema berubah
- [ ] Migration ada
- [ ] DTO validasi berubah
- [ ] Repository/service berubah
- [ ] Seed berubah
- [ ] Dokumen berubah (README/manual bila perlu)

3. **Repository**
   - Buat fungsi query/transaction.
   - Bungkus dengan `safeExecute`.
   - Untuk GET list, gunakan `paginateQuery` + `normalizePagination`.

4. **Service**
   - Taruh business logic di sini.
   - Validasi domain, orkestrasi antar repository/service.
   - Bungkus dengan `safeExecute`.

5. **Controller**
   - Tipis, hanya mapping HTTP ke service.
   - Pakai DTO body/query.
   - Tambahkan Swagger decorator (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth` bila perlu).

6. **Security**
   - Endpoint private wajib `@UseGuards(JwtAuthGuard)`.
   - Endpoint role-based wajib `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
   - Hindari expose data sensitif.

7. **Testing**
   - Unit test untuk logic service penting.
   - E2E minimal untuk endpoint publik/private utama.

8. **Dokumentasi**
   - Update `README.md` endpoint dan contoh query/body.
   - Jika pola baru, update manual ini.

### Contoh format pemakaian (template)

#### A) Controller (tipis, HTTP mapping)

```ts
@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access-token')
  list(@Query() query: ListInventoryQueryDto) {
    return this.inventoryService.list(query);
  }
}
```

#### B) Service (business logic + safeExecute)

```ts
@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepo: InventoryRepository) {}

  async list(query: ListInventoryQueryDto) {
    return safeExecute(
      () =>
        this.inventoryRepo.findMany({
          page: query.page,
          limit: query.limit,
          search: query.search,
        }),
      {
        context: 'InventoryService.list',
        humanMessage: 'Gagal mengambil daftar inventory.',
      },
    );
  }
}
```

#### C) Repository (Prisma + helper pagination)

```ts
async findMany(params: PaginationParams) {
  return safeExecute(async () => {
    const { page, limit, search } = normalizePagination(params);
    const where: Prisma.InventoryWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    };

    return paginateQuery({
      page,
      limit,
      fetchItems: ({ skip, take }) =>
        this.prisma.inventory.findMany({ where, skip, take, orderBy: { id: 'asc' } }),
      countItems: () => this.prisma.inventory.count({ where }),
    });
  }, {
    context: 'InventoryRepository.findMany',
    humanMessage: 'Gagal mengambil data inventory.',
  });
}
```

Catatan:
- Semua GET wajib menyertakan `deletedAt: null`.
- Jangan expose `deletedAt` ke response FE (pakai `select` yang eksplisit).

#### D) Soft delete helper (reusable)

```ts
// shared filter aktif:
const where = activeWhere({ id });

// helper soft delete / restore:
await softDeleteByWhere((args) => this.prisma.product.updateMany(args), { id });
await restoreByWhere((args) => this.prisma.product.updateMany(args), { id });
```

Contoh implementasi di repository:

```ts
async softDeleteById(id: number) {
  return safeExecute(
    () => softDeleteByWhere((args) => this.prisma.product.updateMany(args), { id }),
    { context: 'ProductRepository.softDeleteById', humanMessage: 'Gagal soft delete produk.' },
  );
}
```

## 4) Standar GET List (Pagination + Search)

Gunakan `PaginationQueryDto`:
- `page`: default 1
- `limit`: default 20 (max 100)
- `search`: optional keyword

Jika perlu filter domain (contoh `status`, `role`), buat DTO turunan:
- contoh: `ListOrdersQueryDto extends PaginationQueryDto`
- contoh: `ListUsersQueryDto extends PaginationQueryDto`

Contoh standar response data list:

```json
{
  "success": true,
  "message": "Request berhasil diproses.",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 0,
      "totalPages": 1,
      "hasNextPage": false,
      "nextPage": null,
      "hasPrevPage": false,
      "prevPage": null
    }
  },
  "meta": {
    "at": "2026-01-01T00:00:00.000Z",
    "requestId": "..."
  }
}
```

## 5) Error Handling Standard

- Jangan `try/catch` manual berulang jika hanya pass-through error; gunakan `safeExecute`.
- Untuk domain validation pakai exception Nest (`BadRequestException`, `NotFoundException`, dst).
- Pesan error wajib jelas dan mudah dimengerti user.
- Unhandled error akan:
  - diformat oleh `AllExceptionsFilter`,
  - disimpan ke tabel `ops.error_logs`.

## 6) Reusable Components yang Harus Dipakai

- `src/shared/http/api-response.ts`
- `src/shared/http/pagination.ts`
- `src/shared/dto/pagination-query.dto.ts`
- `src/shared/utils/safe-execute.ts`
- `src/shared/services/error-log.service.ts`
- `src/shared/decorators/roles.decorator.ts`
- `src/shared/guards/roles.guard.ts`
- `src/shared/database/soft-delete.helper.ts`
- `src/shared/database/soft-delete-repository.helper.ts`

Contoh endpoint list yang sudah konsisten:
- `GET /api/products` (page, limit, search)
- `GET /api/purchasing/orders` (page, limit, search, status)
- `GET /api/users` (page, limit, search, role; admin only)

## 7) Role Auth Flow (Jangan Ambil Role dari FE)

1. Login berhasil -> BE sign JWT berisi role:
   - `{ sub: userId, email: "...", role: "admin" }`
2. Client request endpoint private:
   - `Authorization: Bearer <token>`
3. `JwtStrategy` decode token -> set `req.user`.
4. `RolesGuard` cek `req.user.role`.
5. Jika role tidak sesuai -> reject (`403`).

Contoh pemakaian:

```ts
@Get('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
listUsers(@Query() query: ListUsersQueryDto) {
  return this.userService.listUsers(query);
}
```

## 8) Token Session (Login + Logout Revoke)

Prinsip:
- Token JWT yang aktif disimpan di DB (`auth.auth_tokens`) menggunakan `jti`.
- `JwtStrategy` wajib cek token aktif di DB.
- `logout` wajib revoke token saat ini.

Contoh alur di service auth:

```ts
// login/register:
const jti = randomUUID();
const token = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, jti });
await this.authRepo.saveAuthToken({ userId: user.id, jti, expiresAt });

// logout:
await this.authRepo.revokeTokenByJti(currentUser.tokenId);
```

Contoh endpoint logout:

```ts
@Post('logout')
@UseGuards(JwtAuthGuard)
logout(@CurrentUser() user: RequestUser) {
  return this.authService.logout(user.tokenId);
}
```

## 9) Do / Don't

Do:
- Tambah index DB untuk query yang sering dipakai.
- Buat method repository spesifik use-case (jangan query mentah di service).
- Pertahankan nama method konsisten: `find`, `list`, `create`, `update`, `remove`.

Don't:
- Jangan akses Prisma langsung dari controller.
- Jangan kirim stack trace ke response frontend.
- Jangan copy-paste formatter response di tiap endpoint.

## 10) Operasional Cepat (Developer Baru)

Urutan paling aman untuk mulai project:

```bash
cp .env.example .env
npm install
npm run doctor
npm run db:setup
npm run start:dev
```

Jika `doctor` gagal:
- perbaiki `.env`
- pastikan Postgres/Redis aktif
- jalankan ulang `npm run doctor`
