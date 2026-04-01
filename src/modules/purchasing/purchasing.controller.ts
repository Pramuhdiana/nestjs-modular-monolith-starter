import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../../shared/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto } from './dto/list-orders.query.dto';
import { PurchasingService } from './purchasing.service';

@ApiTags('purchasing')
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly purchasing: PurchasingService) {}

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List orders for current user (pagination + search + status)',
    description:
      'Mendukung query `page`, `limit`, `search`, `status` untuk kebutuhan daftar order dan infinite scroll.',
  })
  listOrders(@CurrentUser() user: RequestUser, @Query() query: ListOrdersQueryDto) {
    return this.purchasing.listOrders(user.userId, query);
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create order from item lines (validates products, queues email)' })
  createOrder(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.purchasing.createOrder(user.userId, dto);
  }
}
