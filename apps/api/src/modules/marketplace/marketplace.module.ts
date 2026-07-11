import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { ProductsModule } from '../products/products.module';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesService } from './categories.service';
import { FavoritesService } from './favorites.service';
import { MarketplaceController } from './marketplace.controller';
import { ProductCategoriesController } from './product-categories.controller';
import { ProductSummaryMapper } from './product-summary.mapper';
import { SearchService } from './search.service';

@Module({
  imports: [ProductsModule, AnalyticsModule],
  controllers: [MarketplaceController, AdminCategoriesController, ProductCategoriesController],
  providers: [SearchService, CategoriesService, FavoritesService, ProductSummaryMapper],
  exports: [SearchService, CategoriesService],
})
export class MarketplaceModule {}
