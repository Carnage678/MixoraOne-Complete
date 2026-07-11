import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateFeedbackInput, FeedbackRecord } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(userId: string, input: CreateFeedbackInput): Promise<FeedbackRecord> {
    if (input.productId) {
      const product = await this.prisma.product.findUnique({ where: { id: input.productId } });
      if (!product) {
        throw new NotFoundException('Product not found');
      }
    }

    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        productId: input.productId ?? null,
        subject: input.subject.trim(),
        body: input.body.trim(),
      },
    });

    await this.auditLog.record({
      action: 'feedback.created',
      userId,
      metadata: { feedbackId: feedback.id, productId: input.productId ?? null },
    });

    return {
      id: feedback.id,
      subject: feedback.subject,
      body: feedback.body,
      productId: feedback.productId,
      createdAt: feedback.createdAt.toISOString(),
    };
  }
}
