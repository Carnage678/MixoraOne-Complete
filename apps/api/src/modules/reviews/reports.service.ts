import { BadRequestException, Injectable } from '@nestjs/common';
import type { CreateReportInput, ReportRecord } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(userId: string, input: CreateReportInput): Promise<ReportRecord> {
    await this.assertTargetExists(input.targetType, input.targetId);

    const report = await this.prisma.report.create({
      data: {
        reporterUserId: userId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason.trim(),
        details: input.details?.trim() ?? null,
      },
    });

    await this.prisma.moderationCase.create({
      data: {
        reportId: report.id,
        subjectType: input.targetType,
        subjectId: input.targetId,
      },
    });

    await this.auditLog.record({
      action: 'report.created',
      userId,
      metadata: {
        reportId: report.id,
        targetType: input.targetType,
        targetId: input.targetId,
      },
    });

    return this.toRecord(report);
  }

  async listForAdmin(): Promise<ReportRecord[]> {
    const reports = await this.prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return reports.map((report) => this.toRecord(report));
  }

  private async assertTargetExists(
    targetType: CreateReportInput['targetType'],
    targetId: string,
  ): Promise<void> {
    switch (targetType) {
      case 'REVIEW': {
        const review = await this.prisma.review.findUnique({ where: { id: targetId } });
        if (!review) {
          throw new BadRequestException('Report target review not found');
        }
        break;
      }
      case 'QUESTION': {
        const question = await this.prisma.question.findUnique({ where: { id: targetId } });
        if (!question) {
          throw new BadRequestException('Report target question not found');
        }
        break;
      }
      case 'PRODUCT': {
        const product = await this.prisma.product.findUnique({ where: { id: targetId } });
        if (!product) {
          throw new BadRequestException('Report target product not found');
        }
        break;
      }
      case 'USER': {
        const user = await this.prisma.user.findUnique({ where: { id: targetId } });
        if (!user) {
          throw new BadRequestException('Report target user not found');
        }
        break;
      }
      default:
        throw new BadRequestException('Invalid report target type');
    }
  }

  private toRecord(report: {
    id: string;
    targetType: string;
    targetId: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): ReportRecord {
    return {
      id: report.id,
      targetType: report.targetType as ReportRecord['targetType'],
      targetId: report.targetId,
      reason: report.reason,
      details: report.details,
      status: report.status as ReportRecord['status'],
      createdAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
    };
  }
}
