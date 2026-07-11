import { Body, Controller, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Category } from '@mixoraone/contracts';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from './categories.service';

class SetProductCategoriesDto {
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  slugs!: string[];
}

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductCategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
  ) {}

  @Put(':id/categories')
  @ApiOperation({ summary: 'Assign marketplace categories to a product (owner only)' })
  async setCategories(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: SetProductCategoriesDto,
  ): Promise<Category[]> {
    await this.productsService.requireOwnedProduct(productId, principal.userId);
    return this.categoriesService.setProductCategories(productId, dto.slugs);
  }
}
