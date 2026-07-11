import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FeedbackRecord } from '@mixoraone/contracts';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateFeedbackDto } from './dto/reviews.dtos';
import { FeedbackService } from './feedback.service';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('feedback')
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Submit product or platform feedback' })
  async create(
    @Body() dto: CreateFeedbackDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<FeedbackRecord> {
    await this.rateLimit.consume(
      { name: 'feedback:create', limit: 20, windowSeconds: 3600 },
      principal.userId,
    );
    return this.feedbackService.create(principal.userId, dto);
  }
}
