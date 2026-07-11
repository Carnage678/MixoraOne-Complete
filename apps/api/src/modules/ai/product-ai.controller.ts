import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AiListingSuggestion, ProductSuggestionsResult } from '@mixoraone/contracts';
import { IsIn } from 'class-validator';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthenticatedRequest, AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ListingAnalysisService } from './listing-analysis.service';
import type { LlmProviderPort } from './llm/llm-provider.port';
import { LLM_PROVIDER } from './llm/llm-provider.port';

class UpdateSuggestionDto {
  @IsIn(['APPLY', 'DISMISS'])
  action!: 'APPLY' | 'DISMISS';
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai/products')
export class ProductAiController {
  constructor(
    private readonly listingAnalysis: ListingAnalysisService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProviderPort,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get(':productId/suggestions')
  @ApiOperation({ summary: 'List pending listing improvement suggestions for a product' })
  list(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<AiListingSuggestion[]> {
    return this.listingAnalysis.listProductSuggestions(productId, principal.userId);
  }

  @Post(':productId/suggestions')
  @ApiOperation({ summary: 'Run a one-shot listing analysis and store suggestions' })
  async analyze(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Req() req: AuthenticatedRequest,
  ): Promise<ProductSuggestionsResult> {
    await this.rateLimit.consume(
      { name: 'ai:product-analysis', limit: 20, windowSeconds: 3600 },
      `${principal.userId}:${req.ip ?? 'unknown'}`,
    );
    if (!this.llm.isConfigured()) {
      throw new ServiceUnavailableException(
        'AI assistant is not configured. Set AI_PROVIDER and the matching API key.',
      );
    }
    return this.listingAnalysis.analyzeProduct(productId, principal.userId, this.llm);
  }

  @Patch(':productId/suggestions/:suggestionId')
  @ApiOperation({ summary: 'Apply or dismiss a listing suggestion' })
  resolve(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('suggestionId', ParseUUIDPipe) suggestionId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: UpdateSuggestionDto,
  ): Promise<AiListingSuggestion> {
    return this.listingAnalysis.resolveSuggestion(
      productId,
      suggestionId,
      principal.userId,
      dto.action,
    );
  }
}
