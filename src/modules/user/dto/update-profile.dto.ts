import { ApiProperty } from '@nestjs/swagger';
import { JenisKelamin } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  // Ditambahkan agar update profile bisa validasi enum dari request body (bukan string bebas).
  @ApiProperty({
    example: JenisKelamin.PEREMPUAN,
    enum: JenisKelamin,
    required: false,
  })
  @IsOptional()
  @IsEnum(JenisKelamin)
  jenisKelamin?: JenisKelamin;

  // Ditambahkan agar API menerima flag kepemimpinan profile secara eksplisit.
  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isHead?: boolean;
}
