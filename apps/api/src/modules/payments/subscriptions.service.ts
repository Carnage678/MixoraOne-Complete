import { Injectable, NotFoundException } from '@nestjs/common';
import type { SubscriptionRecord } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<SubscriptionRecord[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
        pricingPlan: true,
      },
    });
    return subscriptions.map((subscription) => ({
      id: subscription.id,
      productId: subscription.productId,
      productName: subscription.product.name,
      planName: subscription.pricingPlan.name,
      status: subscription.status as SubscriptionRecord['status'],
      interval: subscription.pricingPlan.interval,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelledAt: subscription.cancelledAt?.toISOString() ?? null,
      createdAt: subscription.createdAt.toISOString(),
    }));
  }

  async cancel(subscriptionId: string, userId: string): Promise<SubscriptionRecord> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { product: true, pricingPlan: true },
    });
    if (!subscription || subscription.userId !== userId) {
      throw new NotFoundException('Subscription not found');
    }
    const updated = await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { product: true, pricingPlan: true },
    });
    return {
      id: updated.id,
      productId: updated.productId,
      productName: updated.product.name,
      planName: updated.pricingPlan.name,
      status: updated.status as SubscriptionRecord['status'],
      interval: updated.pricingPlan.interval,
      currentPeriodEnd: updated.currentPeriodEnd?.toISOString() ?? null,
      cancelledAt: updated.cancelledAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
