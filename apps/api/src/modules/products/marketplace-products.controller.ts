import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PublicProduct } from '@mixoraone/contracts';

import { Public } from '../auth/decorators/public.decorator';
import { PublicProductsService } from './public-products.service';

/** Public marketplace read endpoints; search/browse arrive with Epic 6. */
@ApiTags('marketplace')
@Controller('marketplace/products')
export class MarketplaceProductsController {
  constructor(private readonly publicProducts: PublicProductsService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public product detail (published products only)' })
  getBySlug(@Param('slug') slug: string): Promise<PublicProduct> {
    return this.publicProducts.getBySlug(slug);
  }
}
