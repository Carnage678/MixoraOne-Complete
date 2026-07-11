import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ReportRecord } from '@mixoraone/contracts';

import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from '../reviews/reports.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List user-submitted reports' })
  list(): Promise<ReportRecord[]> {
    return this.reportsService.listForAdmin();
  }
}
