import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { QuestionRecord, ReviewRecord } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateQuestionDto, CreateReviewDto } from './dto/reviews.dtos';
import { QnaService } from './qna.service';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Controller('products/:productId')
export class ProductReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly qnaService: QnaService,
  ) {}

  @Public()
  @Get('reviews')
  @ApiOperation({ summary: 'List published reviews for a product' })
  listReviews(@Param('productId') productId: string): Promise<ReviewRecord[]> {
    return this.reviewsService.listForProduct(productId);
  }

  @Post('reviews')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a verified-purchase review' })
  createReview(
    @Param('productId') productId: string,
    @Body() dto: CreateReviewDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ReviewRecord> {
    return this.reviewsService.create(principal.userId, productId, dto);
  }

  @Public()
  @Get('questions')
  @ApiOperation({ summary: 'List Q&A for a product' })
  listQuestions(@Param('productId') productId: string): Promise<QuestionRecord[]> {
    return this.qnaService.listForProduct(productId);
  }

  @Post('questions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ask a product question' })
  createQuestion(
    @Param('productId') productId: string,
    @Body() dto: CreateQuestionDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<QuestionRecord> {
    return this.qnaService.createQuestion(principal.userId, productId, dto);
  }
}
