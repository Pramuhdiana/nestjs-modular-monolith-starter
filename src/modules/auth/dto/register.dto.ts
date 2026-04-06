import { ApiProperty } from '@nestjs/swagger';
import { JenisKelamin } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secretpassword', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  @IsString()
  fullName!: string;

  // Ditambahkan supaya data profile dasar dapat diisi sejak registrasi pertama kali.
  @ApiProperty({
    example: JenisKelamin.PEREMPUAN,
    enum: JenisKelamin,
    required: false,
  })
  @IsOptional()
  @IsEnum(JenisKelamin)
  jenisKelamin?: JenisKelamin;

  // Ditambahkan untuk menjaga konsistensi payload register vs update profile.
  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isHead?: boolean;
}
