import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { DisputeRecord, ResolveDisputeInput } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<DisputeRecord[]> {
    const disputes = await this.prisma.dispute.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return disputes.map((dispute) => this.toRecord(dispute));
  }

  async resolve(
    adminUserId: string,
    disputeId: string,
    input: ResolveDisputeInput,
  ): Promise<DisputeRecord> {
    const dispute = await this.prisma.dispute.findUnique({ where: { id: disputeId } });
    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }
    if (dispute.status !== 'OPEN') {
      throw new BadRequestException('Dispute is already resolved');
    }

    const updated = await this.prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: 'RESOLVED',
        resolution: input.resolution.trim(),
        resolvedAt: new Date(),
      },
    });

    await this.auditLog.record({
      action: 'dispute.resolved',
      userId: adminUserId,
      metadata: { disputeId, orderId: dispute.orderId },
    });

    return this.toRecord(updated);
  }

  private toRecord(dispute: {
    id: string;
    orderId: string | null;
    reporterUserId: string;
    respondentUserId: string | null;
    reason: string;
    status: string;
    resolution: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
  }): DisputeRecord {
    return {
      id: dispute.id,
      orderId: dispute.orderId,
      reporterUserId: dispute.reporterUserId,
      respondentUserId: dispute.respondentUserId,
      reason: dispute.reason,
      status: dispute.status as DisputeRecord['status'],
      resolution: dispute.resolution,
      resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
      createdAt: dispute.createdAt.toISOString(),
    };
  }
}
