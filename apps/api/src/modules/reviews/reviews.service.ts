import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateReviewInput, ReviewRecord } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AnalyticsService } from '../analytics/analytics.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly analytics: AnalyticsService,
  ) {}

  async listForProduct(productId: string): Promise<ReviewRecord[]> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Product not found');
    }

    const reviews = await this.prisma.review.findMany({
      where: { productId, status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      include: {
        user: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { profile: true },
        },
      },
    });

    return reviews.map((review) => this.toRecord(review));
  }

  async create(userId: string, productId: string, input: CreateReviewInput): Promise<ReviewRecord> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.review.findUnique({
      where: { productId_userId: { productId, userId } },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product');
    }

    const purchase = await this.resolveVerifiedPurchase(userId, productId);
    if (!purchase.verified) {
      throw new ForbiddenException('Verified purchase required to leave a review');
    }

    const review = await this.prisma.review.create({
      data: {
        productId,
        userId,
        orderId: purchase.orderId ?? null,
        rating: input.rating,
        title: input.title?.trim() ?? null,
        body: input.body.trim(),
        verifiedPurchase: true,
      },
      include: {
        user: true,
        replies: { include: { profile: true } },
      },
    });

    await this.analytics.incrementProductMetric(productId, 'reviews', 1);
    await this.auditLog.record({
      action: 'review.created',
      userId,
      metadata: { reviewId: review.id, productId, rating: input.rating },
    });

    return this.toRecord(review);
  }

  async reply(
    userId: string,
    reviewId: string,
    body: string,
  ): Promise<ReviewRecord> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: { product: true },
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const profile = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile || review.product.developerProfileId !== profile.id) {
      throw new ForbiddenException('Only the product developer can reply to reviews');
    }

    await this.prisma.reviewReply.create({
      data: {
        reviewId,
        developerProfileId: profile.id,
        body: body.trim(),
      },
    });

    const updated = await this.prisma.review.findUniqueOrThrow({
      where: { id: reviewId },
      include: {
        user: true,
        replies: {
          orderBy: { createdAt: 'asc' },
          include: { profile: true },
        },
      },
    });

    await this.auditLog.record({
      action: 'review.reply_created',
      userId,
      metadata: { reviewId, productId: review.productId },
    });

    return this.toRecord(updated);
  }

  private async resolveVerifiedPurchase(
    userId: string,
    productId: string,
  ): Promise<{ verified: boolean; orderId?: string }> {
    const paidItem = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: 'PAID' },
      },
    });
    if (paidItem) {
      return { verified: true, orderId: paidItem.orderId };
    }

    const license = await this.prisma.license.findFirst({
      where: { userId, productId, status: 'ACTIVE' },
    });
    return { verified: license !== null };
  }

  private toRecord(review: {
    id: string;
    productId: string;
    userId: string;
    rating: number;
    title: string | null;
    body: string;
    verifiedPurchase: boolean;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    user: { name: string };
    replies: Array<{
      id: string;
      body: string;
      createdAt: Date;
      profile: { displayName: string };
    }>;
  }): ReviewRecord {
    return {
      id: review.id,
      productId: review.productId,
      userId: review.userId,
      userName: review.user.name,
      rating: review.rating,
      title: review.title,
      body: review.body,
      verifiedPurchase: review.verifiedPurchase,
      status: review.status as ReviewRecord['status'],
      replies: review.replies.map((reply) => ({
        id: reply.id,
        body: reply.body,
        developerDisplayName: reply.profile.displayName,
        createdAt: reply.createdAt.toISOString(),
      })),
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    };
  }
}
