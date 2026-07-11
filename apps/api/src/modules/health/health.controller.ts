import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { HealthReport } from '@mixoraone/contracts';

import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and dependency health' })
  @ApiOkResponse({ description: 'Health report including database and Redis status' })
  check(): Promise<HealthReport> {
    return this.healthService.check();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe (503 when database or Redis is down)' })
  @ApiOkResponse({ description: 'All dependencies reachable' })
  ready(): Promise<HealthReport> {
    return this.healthService.ready();
  }
}
