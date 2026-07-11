import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { SubscriptionRecord } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'List own subscriptions' })
  list(@CurrentUser() principal: AuthPrincipal): Promise<SubscriptionRecord[]> {
    return this.subscriptions.listForUser(principal.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel an active subscription' })
  cancel(
    @Param('id', ParseUUIDPipe) subscriptionId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<SubscriptionRecord> {
    return this.subscriptions.cancel(subscriptionId, principal.userId);
  }
}
