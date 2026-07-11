import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { QuestionRecord } from '@mixoraone/contracts';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateAnswerDto } from './dto/reviews.dtos';
import { QnaService } from './qna.service';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly qnaService: QnaService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post(':id/answers')
  @ApiOperation({ summary: 'Answer a product question (developer only)' })
  async answer(
    @Param('id') questionId: string,
    @Body() dto: CreateAnswerDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<QuestionRecord> {
    await this.rateLimit.consume(
      { name: 'questions:answer', limit: 60, windowSeconds: 3600 },
      principal.userId,
    );
    return this.qnaService.createAnswer(principal.userId, questionId, dto);
  }
}
