import { Module } from '@nestjs/common';

import { ReviewsModule } from '../reviews/reviews.module';
import { AdminReportsController } from './admin-reports.controller';
import { AdminDisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { AdminModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { AdminTrustController } from './trust.controller';
import { TrustService } from './trust.service';

@Module({
  imports: [ReviewsModule],
  controllers: [
    AdminTrustController,
    AdminModerationController,
    AdminReportsController,
    AdminDisputesController,
  ],
  providers: [TrustService, ModerationService, DisputesService],
})
export class AdminModule {}
