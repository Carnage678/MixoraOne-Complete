import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Category, ProductSummary, SearchResults } from '@mixoraone/contracts';

import type { AuthenticatedRequest, AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CategoriesService } from './categories.service';
import { SearchQueryDto } from './dto/marketplace.dtos';
import { FavoritesService } from './favorites.service';
import { SearchService } from './search.service';

@ApiTags('marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly searchService: SearchService,
    private readonly categoriesService: CategoriesService,
    private readonly favoritesService: FavoritesService,
  ) {}

  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search and browse published products' })
  search(@Query() query: SearchQueryDto, @Req() req: AuthenticatedRequest): Promise<SearchResults> {
    return this.searchService.search({
      query: query.q,
      category: query.category,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
      userId: req.user?.userId,
    });
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List marketplace categories' })
  categories(): Promise<Category[]> {
    return this.categoriesService.list();
  }

  @Get('favorites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Saved products for the current user' })
  favorites(@CurrentUser() principal: AuthPrincipal): Promise<ProductSummary[]> {
    return this.favoritesService.list(principal.userId);
  }

  @Get('favorites/slugs')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Slugs of saved products (for toggling UI state)' })
  favoriteSlugs(@CurrentUser() principal: AuthPrincipal): Promise<string[]> {
    return this.favoritesService.slugsFor(principal.userId);
  }

  @Post('favorites/:productId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Save a product' })
  addFavorite(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<void> {
    return this.favoritesService.add(principal.userId, productId);
  }

  @Delete('favorites/:productId')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a saved product' })
  removeFavorite(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<void> {
    return this.favoritesService.remove(principal.userId, productId);
  }
}
