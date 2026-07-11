import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  Product,
  ProductAsset,
  ProductDoc,
  ProductPricingPlan,
  ProductVersion,
} from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateAssetDto,
  CreateDocDto,
  CreatePricingPlanDto,
  CreateProductDto,
  CreateVersionDto,
  UpdateDocDto,
  UpdateProductDto,
} from './dto/product.dtos';
import { ProductContentService } from './product-content.service';
import { ProductsService } from './products.service';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly contentService: ProductContentService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List own product listings' })
  list(@CurrentUser() principal: AuthPrincipal): Promise<Product[]> {
    return this.productsService.listOwn(principal.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft product' })
  create(@CurrentUser() principal: AuthPrincipal, @Body() dto: CreateProductDto): Promise<Product> {
    return this.productsService.create(principal.userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Own product detail' })
  get(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Product> {
    return this.productsService.getOwn(productId, principal.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product fields' })
  update(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(productId, principal.userId, dto);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish (requires description, version, active plan)' })
  publish(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Product> {
    return this.productsService.publish(productId, principal.userId);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive the product (hides it from the marketplace)' })
  archive(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Product> {
    return this.productsService.archive(productId, principal.userId);
  }

  // --- Versions ---

  @Get(':id/versions')
  @ApiOperation({ summary: 'List versions' })
  versions(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ProductVersion[]> {
    return this.contentService.listVersions(productId, principal.userId);
  }

  @Post(':id/versions')
  @ApiOperation({ summary: 'Release a new semantic version' })
  addVersion(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreateVersionDto,
  ): Promise<ProductVersion> {
    return this.contentService.addVersion(productId, principal.userId, dto);
  }

  // --- Assets ---

  @Post(':id/assets')
  @ApiOperation({ summary: 'Attach an asset (screenshot, video, document, link)' })
  addAsset(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreateAssetDto,
  ): Promise<ProductAsset> {
    return this.contentService.addAsset(productId, principal.userId, dto);
  }

  @Delete(':id/assets/:assetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove an asset' })
  removeAsset(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<void> {
    return this.contentService.removeAsset(productId, principal.userId, assetId);
  }

  // --- Docs ---

  @Post(':id/docs')
  @ApiOperation({ summary: 'Add a documentation page' })
  addDoc(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreateDocDto,
  ): Promise<ProductDoc> {
    return this.contentService.addDoc(productId, principal.userId, dto);
  }

  @Patch(':id/docs/:docId')
  @ApiOperation({ summary: 'Update a documentation page' })
  updateDoc(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: UpdateDocDto,
  ): Promise<ProductDoc> {
    return this.contentService.updateDoc(productId, principal.userId, docId, dto);
  }

  // --- Pricing ---

  @Get(':id/pricing-plans')
  @ApiOperation({ summary: 'List pricing plans' })
  pricingPlans(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ProductPricingPlan[]> {
    return this.contentService.listPricingPlans(productId, principal.userId);
  }

  @Post(':id/pricing-plans')
  @ApiOperation({ summary: 'Add a pricing plan' })
  addPricingPlan(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreatePricingPlanDto,
  ): Promise<ProductPricingPlan> {
    return this.contentService.addPricingPlan(productId, principal.userId, dto);
  }

  @Post(':id/pricing-plans/:planId/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a pricing plan' })
  deactivatePlan(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ProductPricingPlan> {
    return this.contentService.setPlanActive(productId, principal.userId, planId, false);
  }

  @Post(':id/pricing-plans/:planId/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a pricing plan' })
  activatePlan(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ProductPricingPlan> {
    return this.contentService.setPlanActive(productId, principal.userId, planId, true);
  }
}
