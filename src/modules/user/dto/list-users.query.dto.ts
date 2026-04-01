import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'user',
    description: 'Filter role user (admin atau user)',
  })
  @IsOptional()
  @IsIn(['admin', 'user'])
  role?: 'admin' | 'user';
}
