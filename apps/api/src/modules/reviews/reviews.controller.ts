import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ReviewRecord } from '@mixoraone/contracts';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateReviewReplyDto } from './dto/reviews.dtos';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post(':id/replies')
  @ApiOperation({ summary: 'Reply to a review (product developer only)' })
  async reply(
    @Param('id') reviewId: string,
    @Body() dto: CreateReviewReplyDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ReviewRecord> {
    await this.rateLimit.consume(
      { name: 'reviews:reply', limit: 30, windowSeconds: 3600 },
      principal.userId,
    );
    return this.reviewsService.reply(principal.userId, reviewId, dto.body);
  }
}
