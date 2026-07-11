import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ModerationCaseRecord } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModerationDecisionDto } from './dto/admin.dtos';
import { ModerationService } from './moderation.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List moderation cases' })
  list(): Promise<ModerationCaseRecord[]> {
    return this.moderationService.list();
  }

  @Post(':id/decision')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Resolve a moderation case' })
  decide(
    @Param('id') caseId: string,
    @Body() dto: ModerationDecisionDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<ModerationCaseRecord> {
    return this.moderationService.decide(principal.userId, caseId, dto);
  }
}
