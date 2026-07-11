import { Injectable, Logger } from '@nestjs/common';

import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface AuditEntry {
  action: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only audit trail for security and business events. Writes must never
 * break the calling flow, so failures are logged and swallowed.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          userId: entry.userId ?? null,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null,
          metadata: (entry.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log '${entry.action}': ${(error as Error).message}`);
    }
  }
}
