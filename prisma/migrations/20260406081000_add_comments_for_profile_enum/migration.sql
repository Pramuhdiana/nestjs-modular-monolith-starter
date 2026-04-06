-- Add descriptive comments for enum and profile fields.
COMMENT ON TYPE "users"."JenisKelamin" IS 'Enum jenis kelamin yang diizinkan: LAKI_LAKI, PEREMPUAN.';

COMMENT ON COLUMN "users"."profiles"."jenis_kelamin" IS 'Jenis kelamin user profile. Nilai valid: LAKI_LAKI atau PEREMPUAN.';

COMMENT ON COLUMN "users"."profiles"."is_head" IS 'Penanda apakah user adalah kepala unit/penanggung jawab (true/false).';
