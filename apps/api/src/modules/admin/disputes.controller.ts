import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DisputeRecord } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ResolveDisputeDto } from './dto/admin.dtos';
import { DisputesService } from './disputes.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List order disputes' })
  list(): Promise<DisputeRecord[]> {
    return this.disputesService.list();
  }

  @Post(':id/resolve')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Resolve a dispute' })
  resolve(
    @Param('id') disputeId: string,
    @Body() dto: ResolveDisputeDto,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<DisputeRecord> {
    return this.disputesService.resolve(principal.userId, disputeId, dto);
  }
}
