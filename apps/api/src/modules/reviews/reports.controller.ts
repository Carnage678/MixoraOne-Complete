import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ReportRecord } from '@mixoraone/contracts';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateReportDto } from './dto/reviews.dtos';
import { ReportsService } from './reports.service';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Report content for moderation' })
  async create(
    @Body() dto: CreateReportDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ReportRecord> {
    await this.rateLimit.consume(
      { name: 'reports:create', limit: 30, windowSeconds: 3600 },
      principal.userId,
    );
    return this.reportsService.create(principal.userId, dto);
  }
}
