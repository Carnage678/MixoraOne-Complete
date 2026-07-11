import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { ModerationCaseRecord, ModerationDecisionInput } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<ModerationCaseRecord[]> {
    const cases = await this.prisma.moderationCase.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return cases.map((entry) => this.toRecord(entry));
  }

  async decide(
    adminUserId: string,
    caseId: string,
    input: ModerationDecisionInput,
  ): Promise<ModerationCaseRecord> {
    const moderationCase = await this.prisma.moderationCase.findUnique({
      where: { id: caseId },
      include: { report: true },
    });
    if (!moderationCase) {
      throw new NotFoundException('Moderation case not found');
    }
    if (moderationCase.status !== 'OPEN') {
      throw new BadRequestException('Moderation case is already resolved');
    }

    const updated = await this.prisma.moderationCase.update({
      where: { id: caseId },
      data: {
        status: 'RESOLVED',
        decision: input.decision,
        decidedByUserId: adminUserId,
        decisionNote: input.decisionNote?.trim() ?? null,
        resolvedAt: new Date(),
      },
    });

    if (moderationCase.reportId) {
      const reportStatus = input.decision === 'APPROVE' ? 'DISMISSED' : 'REVIEWED';
      await this.prisma.report.update({
        where: { id: moderationCase.reportId },
        data: { status: reportStatus },
      });
    }

    if (input.decision === 'REMOVE') {
      await this.applyRemoval(moderationCase.subjectType, moderationCase.subjectId);
    }

    await this.auditLog.record({
      action: 'moderation.decided',
      userId: adminUserId,
      metadata: {
        caseId,
        decision: input.decision,
        subjectType: moderationCase.subjectType,
        subjectId: moderationCase.subjectId,
      },
    });

    return this.toRecord(updated);
  }

  private async applyRemoval(subjectType: string, subjectId: string): Promise<void> {
    switch (subjectType) {
      case 'REVIEW':
        await this.prisma.review.update({
          where: { id: subjectId },
          data: { status: 'REMOVED' },
        });
        break;
      case 'PRODUCT':
        await this.prisma.product.update({
          where: { id: subjectId },
          data: { status: 'ARCHIVED' },
        });
        break;
      default:
        break;
    }
  }

  private toRecord(entry: {
    id: string;
    reportId: string | null;
    subjectType: string;
    subjectId: string;
    status: string;
    decision: string | null;
    decisionNote: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
  }): ModerationCaseRecord {
    return {
      id: entry.id,
      reportId: entry.reportId,
      subjectType: entry.subjectType,
      subjectId: entry.subjectId,
      status: entry.status as ModerationCaseRecord['status'],
      decision: entry.decision as ModerationCaseRecord['decision'],
      decisionNote: entry.decisionNote,
      resolvedAt: entry.resolvedAt?.toISOString() ?? null,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
