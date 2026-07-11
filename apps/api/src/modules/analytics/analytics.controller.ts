import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AdminAnalyticsOverview,
  DeveloperAnalyticsOverview,
  MarketplaceFunnel,
  ProductAnalyticsDetail,
} from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('developer/overview')
  @Roles('DEVELOPER', 'ADMIN')
  @ApiOperation({ summary: 'Developer dashboard analytics overview' })
  developerOverview(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<DeveloperAnalyticsOverview> {
    return this.analyticsService.getDeveloperOverview(principal.userId);
  }

  @Get('developer/products/:productId')
  @Roles('DEVELOPER', 'ADMIN')
  @ApiOperation({ summary: 'Per-product analytics for a developer' })
  developerProduct(
    @Param('productId') productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ProductAnalyticsDetail> {
    return this.analyticsService.getProductDetail(principal.userId, productId);
  }

  @Get('admin/overview')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Platform-wide analytics overview' })
  adminOverview(): Promise<AdminAnalyticsOverview> {
    return this.analyticsService.getAdminOverview();
  }

  @Get('marketplace/funnel')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Marketplace conversion funnel metrics' })
  marketplaceFunnel(): Promise<MarketplaceFunnel> {
    return this.analyticsService.getMarketplaceFunnel();
  }
}
