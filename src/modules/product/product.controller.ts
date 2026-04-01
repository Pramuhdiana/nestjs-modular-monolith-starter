import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';
import { ProductService } from './product.service';

@ApiTags('products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @ApiOperation({
    summary: 'List active products (pagination + search)',
    description:
      'Mendukung query `page`, `limit`, `search` untuk kebutuhan infinite scroll frontend.',
  })
  list(@Query() query: PaginationQueryDto) {
    return this.productService.list(query);
  }
}
