import { Injectable } from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';
import { safeExecute } from '../../shared/utils/safe-execute';

@Injectable()
export class ProductService {
  constructor(private readonly products: ProductRepository) {}

  async list(query: PaginationQueryDto) {
    return safeExecute(() => this.products.findManyActive(query), {
      context: 'ProductService.list',
      humanMessage: 'Gagal mengambil data produk.',
    });
  }
}
