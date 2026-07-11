import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { Roles } from './decorators/roles.decorator';

export interface AuditLogEntry {
  id: string;
  action: string;
  userId: string | null;
  ip: string | null;
  createdAt: string;
}

/** First RBAC-gated surface: admins can inspect the security audit trail. */
@ApiTags('admin')
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recent audit log entries (admin only)' })
  async list(@Query('limit') limit?: string): Promise<AuditLogEntry[]> {
    const take = Math.min(Number(limit) || 50, 200);
    const entries = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
    });
    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      userId: entry.userId,
      ip: entry.ip,
      createdAt: entry.createdAt.toISOString(),
    }));
  }
}
