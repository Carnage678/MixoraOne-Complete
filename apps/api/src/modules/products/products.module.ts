import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { MarketplaceProductsController } from './marketplace-products.controller';
import { ProductContentService } from './product-content.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { PublicProductsService } from './public-products.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [ProductsController, MarketplaceProductsController],
  providers: [ProductsService, ProductContentService, PublicProductsService],
  exports: [ProductsService, PublicProductsService],
})
export class ProductsModule {}
