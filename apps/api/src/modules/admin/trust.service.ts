import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { TrustCheckDecisionInput, TrustCheckRecord } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class TrustService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<TrustCheckRecord[]> {
    const checks = await this.prisma.trustCheck.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return checks.map((check) => this.toRecord(check));
  }

  async decide(
    adminUserId: string,
    trustCheckId: string,
    input: TrustCheckDecisionInput,
  ): Promise<TrustCheckRecord> {
    const check = await this.prisma.trustCheck.findUnique({ where: { id: trustCheckId } });
    if (!check) {
      throw new NotFoundException('Trust check not found');
    }
    if (check.status !== 'PENDING') {
      throw new BadRequestException('Trust check has already been decided');
    }

    const updated = await this.prisma.trustCheck.update({
      where: { id: trustCheckId },
      data: {
        status: input.status,
        decidedByUserId: adminUserId,
        decisionNote: input.decisionNote?.trim() ?? null,
        decidedAt: new Date(),
      },
    });

    if (input.status === 'APPROVED' && check.kind === 'DEVELOPER') {
      const profile = await this.prisma.developerProfile.findUnique({
        where: { id: check.subjectId },
      });
      if (profile) {
        await this.prisma.developerProfile.update({
          where: { id: profile.id },
          data: { verifiedAt: new Date() },
        });
      }
    }

    await this.auditLog.record({
      action: 'trust_check.decided',
      userId: adminUserId,
      metadata: {
        trustCheckId,
        status: input.status,
        kind: check.kind,
        subjectId: check.subjectId,
      },
    });

    return this.toRecord(updated);
  }

  private toRecord(check: {
    id: string;
    kind: string;
    subjectType: string;
    subjectId: string;
    status: string;
    evidence: string | null;
    decisionNote: string | null;
    decidedAt: Date | null;
    createdAt: Date;
  }): TrustCheckRecord {
    return {
      id: check.id,
      kind: check.kind as TrustCheckRecord['kind'],
      subjectType: check.subjectType,
      subjectId: check.subjectId,
      status: check.status as TrustCheckRecord['status'],
      evidence: check.evidence,
      decisionNote: check.decisionNote,
      decidedAt: check.decidedAt?.toISOString() ?? null,
      createdAt: check.createdAt.toISOString(),
    };
  }
}
