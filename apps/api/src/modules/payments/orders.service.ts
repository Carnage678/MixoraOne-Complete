import { Injectable, NotFoundException } from '@nestjs/common';
import type { InvoiceStatus, OrderDetail, OrderSummary, PaymentRecord } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string): Promise<OrderSummary[]> {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });
    return orders.map((order) => this.toSummary(order));
  }

  async getForUser(orderId: string, userId: string): Promise<OrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
        invoice: true,
      },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }
    return this.toDetail(order);
  }

  private toSummary(order: {
    id: string;
    status: string;
    totalCents: number;
    currency: string;
    createdAt: Date;
    items: Array<{ productName: string }>;
  }): OrderSummary {
    return {
      id: order.id,
      status: order.status as OrderSummary['status'],
      totalCents: order.totalCents,
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      itemCount: order.items.length,
      primaryProductName: order.items[0]?.productName ?? null,
    };
  }

  private toDetail(order: {
    id: string;
    status: string;
    totalCents: number;
    currency: string;
    createdAt: Date;
    items: Array<{
      id: string;
      productId: string;
      pricingPlanId: string;
      productName: string;
      planName: string;
      pricingType: string;
      quantity: number;
      unitPriceCents: number;
      currency: string;
    }>;
    payments: Array<{
      id: string;
      provider: string;
      status: string;
      amountCents: number;
      currency: string;
      createdAt: Date;
    }>;
    invoice: {
      id: string;
      number: string;
      status: string;
      amountCents: number;
      currency: string;
      issuedAt: Date;
      paidAt: Date | null;
    } | null;
  }): OrderDetail {
    return {
      ...this.toSummary(order),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        pricingPlanId: item.pricingPlanId,
        productName: item.productName,
        planName: item.planName,
        pricingType: item.pricingType as OrderDetail['items'][number]['pricingType'],
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        currency: item.currency,
      })),
      payments: order.payments.map(
        (payment): PaymentRecord => ({
          id: payment.id,
          provider: payment.provider,
          status: payment.status as PaymentRecord['status'],
          amountCents: payment.amountCents,
          currency: payment.currency,
          createdAt: payment.createdAt.toISOString(),
        }),
      ),
      invoice: order.invoice
        ? {
            id: order.invoice.id,
            number: order.invoice.number,
            status: order.invoice.status as InvoiceStatus,
            amountCents: order.invoice.amountCents,
            currency: order.invoice.currency,
            issuedAt: order.invoice.issuedAt.toISOString(),
            paidAt: order.invoice.paidAt?.toISOString() ?? null,
          }
        : null,
    };
  }
}
