import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CheckoutService } from './checkout.service';
import type { PaymentProviderPort } from './payment-provider.port';
import { PAYMENT_PROVIDER } from './payment-provider.port';
import { MockPaymentProvider } from './mock-payment.provider';
import { StripePaymentProvider } from './stripe-payment.provider';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkout: CheckoutService,
    @Inject(PAYMENT_PROVIDER) private readonly defaultProvider: PaymentProviderPort,
    private readonly mockProvider: MockPaymentProvider,
    private readonly stripeProvider: StripePaymentProvider,
  ) {}

  async handle(providerName: string, rawBody: Buffer, signatureHeader: string | undefined) {
    const provider = this.resolveProvider(providerName);
    const event = provider.verifyWebhook(rawBody, signatureHeader);
    if (!event) {
      throw new BadRequestException('Invalid webhook signature or payload');
    }

    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { provider_eventId: { provider: providerName, eventId: event.eventId } },
    });
    if (existing?.status === 'PROCESSED') {
      return { duplicate: true, orderId: event.orderId };
    }

    const stored =
      existing ??
      (await this.prisma.paymentWebhookEvent.create({
        data: {
          provider: providerName,
          eventId: event.eventId,
          payload: JSON.parse(rawBody.toString('utf8')),
        },
      }));

    try {
      if (event.paymentStatus === 'succeeded') {
        await this.checkout.fulfillPaidOrder(event.orderId, {
          provider: providerName,
          providerPaymentId: event.providerPaymentId,
          providerSubscriptionId: event.providerSubscriptionId,
          currentPeriodEnd: event.currentPeriodEnd,
        });
      } else {
        await this.checkout.markOrderFailed(event.orderId);
      }
      await this.prisma.paymentWebhookEvent.update({
        where: { id: stored.id },
        data: { status: 'PROCESSED', processedAt: new Date(), error: null },
      });
      return { duplicate: false, orderId: event.orderId };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook processing failed';
      this.logger.error(`Webhook ${event.eventId} failed: ${message}`);
      await this.prisma.paymentWebhookEvent.update({
        where: { id: stored.id },
        data: { status: 'FAILED', processedAt: new Date(), error: message },
      });
      throw error;
    }
  }

  private resolveProvider(name: string): PaymentProviderPort {
    if (name === 'mock') {
      return this.mockProvider;
    }
    if (name === 'stripe') {
      return this.stripeProvider;
    }
    if (name === this.defaultProvider.name) {
      return this.defaultProvider;
    }
    throw new BadRequestException(`Unknown payment provider: ${name}`);
  }
}
