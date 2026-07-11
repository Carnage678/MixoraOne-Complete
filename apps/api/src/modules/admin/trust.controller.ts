import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { TrustCheckRecord } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { TrustCheckDecisionDto } from './dto/admin.dtos';
import { TrustService } from './trust.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/trust-checks')
export class AdminTrustController {
  constructor(private readonly trustService: TrustService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List trust verification checks' })
  list(): Promise<TrustCheckRecord[]> {
    return this.trustService.list();
  }

  @Post(':id/decision')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Approve or reject a trust check' })
  decide(
    @Param('id') trustCheckId: string,
    @Body() dto: TrustCheckDecisionDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<TrustCheckRecord> {
    return this.trustService.decide(principal.userId, trustCheckId, dto);
  }
}
