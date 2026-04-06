-- CreateEnum
CREATE TYPE "users"."JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- AlterTable
ALTER TABLE "users"."profiles" ADD COLUMN     "is_head" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "jenis_kelamin" "users"."JenisKelamin";
