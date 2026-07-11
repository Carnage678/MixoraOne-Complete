import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Category } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/marketplace.dtos';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a marketplace category (admin only)' })
  create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<Category> {
    return this.categoriesService.create(dto.name, principal.userId);
  }
}
