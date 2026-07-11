import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OrderDetail, OrderSummary } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List own orders' })
  list(@CurrentUser() principal: AuthPrincipal): Promise<OrderSummary[]> {
    return this.orders.listForUser(principal.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Order detail with items, payments, and invoice' })
  get(
    @Param('id', ParseUUIDPipe) orderId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<OrderDetail> {
    return this.orders.getForUser(orderId, principal.userId);
  }
}
