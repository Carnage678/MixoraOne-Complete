import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { CheckoutSessionResult, OrderStatus } from '@mixoraone/contracts';

import { AppConfigService } from '../../core/config/app-config.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { LicensingService } from '../licensing/licensing.service';
import type { PaymentProviderPort } from './payment-provider.port';
import { PAYMENT_PROVIDER } from './payment-provider.port';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly payments: PaymentProviderPort,
    private readonly config: AppConfigService,
    private readonly auditLog: AuditLogService,
    private readonly licensing: LicensingService,
    private readonly analytics: AnalyticsService,
  ) {}

  async createSession(
    userId: string,
    userEmail: string,
    pricingPlanId: string,
    idempotencyKey: string | undefined,
    successPath = '/orders',
    cancelPath = '/marketplace',
  ): Promise<CheckoutSessionResult> {
    if (idempotencyKey) {
      const existing = await this.prisma.order.findFirst({
        where: { userId, idempotencyKey },
      });
      if (existing) {
        return this.toCheckoutResult(existing);
      }
    }

    const plan = await this.prisma.productPricingPlan.findUnique({
      where: { id: pricingPlanId },
      include: { product: true },
    });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Pricing plan not found');
    }
    if (plan.product.status !== 'PUBLISHED') {
      throw new BadRequestException('This product is not available for purchase');
    }

    const order = await this.prisma.order.create({
      data: {
        userId,
        totalCents: plan.priceCents,
        currency: plan.currency,
        idempotencyKey: idempotencyKey ?? null,
        items: {
          create: {
            productId: plan.productId,
            pricingPlanId: plan.id,
            productName: plan.product.name,
            planName: plan.name,
            pricingType: plan.type,
            unitPriceCents: plan.priceCents,
            currency: plan.currency,
          },
        },
      },
    });

    if (plan.type === 'FREE' || plan.priceCents === 0) {
      await this.fulfillPaidOrder(order.id, {
        provider: 'free',
        providerPaymentId: `free_${order.id}`,
        providerSubscriptionId: undefined,
        currentPeriodEnd: undefined,
      });
      const paid = await this.prisma.order.findUniqueOrThrow({ where: { id: order.id } });
      await this.auditLog.record({
        action: 'checkout.free_completed',
        userId,
        metadata: { orderId: order.id, pricingPlanId },
      });
      return this.toCheckoutResult(paid);
    }

    if (!this.payments.isConfigured()) {
      throw new ServiceUnavailableException(
        'Payments are not configured. Set PAYMENT_PROVIDER and provider credentials.',
      );
    }

    const successUrl = `${this.config.webAppUrl}${successPath}?orderId=${order.id}`;
    const cancelUrl = `${this.config.webAppUrl}${cancelPath}`;
    const session = await this.payments.createCheckoutSession({
      orderId: order.id,
      amountCents: plan.priceCents,
      currency: plan.currency,
      customerEmail: userEmail,
      productName: plan.product.name,
      planName: plan.name,
      mode: plan.type === 'SUBSCRIPTION' ? 'subscription' : 'payment',
      successUrl,
      cancelUrl,
    });

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        provider: this.payments.name,
        providerSessionId: session.providerSessionId,
      },
    });

    await this.auditLog.record({
      action: 'checkout.session_created',
      userId,
      metadata: {
        orderId: order.id,
        pricingPlanId,
        provider: this.payments.name,
      },
    });

    return {
      orderId: updated.id,
      checkoutUrl: session.checkoutUrl,
      status: updated.status as OrderStatus,
      provider: this.payments.name,
    };
  }

  async fulfillPaidOrder(
    orderId: string,
    payment: {
      provider: string;
      providerPaymentId: string;
      providerSubscriptionId?: string;
      currentPeriodEnd?: string;
    },
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === 'PAID') {
      return;
    }

    const item = order.items[0];
    if (!item) {
      throw new BadRequestException('Order has no items');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });
      await tx.payment.upsert({
        where: {
          provider_providerPaymentId: {
            provider: payment.provider,
            providerPaymentId: payment.providerPaymentId,
          },
        },
        create: {
          orderId,
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId,
          status: 'SUCCEEDED',
          amountCents: order.totalCents,
          currency: order.currency,
        },
        update: { status: 'SUCCEEDED' },
      });

      const invoiceNumber = `INV-${Date.now()}-${randomBytes(3).toString('hex')}`;
      await tx.invoice.upsert({
        where: { orderId },
        create: {
          userId: order.userId,
          orderId,
          number: invoiceNumber,
          amountCents: order.totalCents,
          currency: order.currency,
          status: 'PAID',
          issuedAt: new Date(),
          paidAt: new Date(),
        },
        update: { status: 'PAID', paidAt: new Date() },
      });

      if (item.pricingType === 'SUBSCRIPTION') {
        const periodEnd = payment.currentPeriodEnd
          ? new Date(payment.currentPeriodEnd)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await tx.subscription.upsert({
          where: { orderId },
          create: {
            userId: order.userId,
            productId: item.productId,
            pricingPlanId: item.pricingPlanId,
            orderId,
            provider: payment.provider,
            providerSubscriptionId: payment.providerSubscriptionId ?? null,
            status: 'ACTIVE',
            currentPeriodEnd: periodEnd,
          },
          update: {
            status: 'ACTIVE',
            providerSubscriptionId: payment.providerSubscriptionId ?? undefined,
            currentPeriodEnd: periodEnd,
          },
        });
      }
    });

    await this.auditLog.record({
      action: 'order.paid',
      userId: order.userId,
      metadata: { orderId, provider: payment.provider },
    });

    await this.licensing.grantFromPaidOrder(orderId);
    await this.analytics.recordOrderPaid(orderId);
  }

  async markOrderFailed(orderId: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'FAILED' },
    });
  }

  private toCheckoutResult(order: {
    id: string;
    status: string;
    provider: string | null;
    providerSessionId: string | null;
  }): CheckoutSessionResult {
    const checkoutUrl =
      order.status === 'PAID'
        ? `${this.config.webAppUrl}/orders/${order.id}`
        : order.providerSessionId
          ? `${this.config.webAppUrl}/checkout/complete?orderId=${order.id}&session=${order.providerSessionId}`
          : null;
    return {
      orderId: order.id,
      checkoutUrl,
      status: order.status as OrderStatus,
      provider: order.provider ?? 'free',
    };
  }
}
