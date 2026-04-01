/**
 * Validasi env saat bootstrap — KENAPA:
 * - Gagal cepat (fail-fast) jika secret/URL tidak ada → hindari runtime error di tengah request
 * - Dokumentasi implisit: apa saja yang wajib di production
 */
import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsNumberString, IsOptional, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNotEmpty()
  @IsString()
  DATABASE_URL!: string;

  @IsNotEmpty()
  @IsString()
  JWT_SECRET!: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsNumberString()
  PORT?: string;

  @IsOptional()
  @IsString()
  REDIS_HOST?: string;

  @IsOptional()
  @IsNumberString()
  REDIS_PORT?: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_TTL_MS?: string;

  @IsOptional()
  @IsNumberString()
  THROTTLE_LIMIT?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}
