import { Module } from '@nestjs/common';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { ProductReviewsController } from './product-reviews.controller';
import { QnaService } from './qna.service';
import { QuestionsController } from './questions.controller';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [
    ProductReviewsController,
    ReviewsController,
    QuestionsController,
    FeedbackController,
    ReportsController,
  ],
  providers: [
    ReviewsService,
    QnaService,
    FeedbackService,
    ReportsService,
    RateLimitService,
  ],
  exports: [ReportsService],
})
export class ReviewsModule {}
