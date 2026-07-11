import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { AppConfigService } from '../../core/config/app-config.service';
import type {
  CheckoutSessionResult,
  CreateCheckoutParams,
  PaymentProviderPort,
  PaymentWebhookEvent,
} from './payment-provider.port';

/** Local/dev provider that simulates hosted checkout without external APIs. */
@Injectable()
export class MockPaymentProvider implements PaymentProviderPort {
  readonly name = 'mock';

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return true;
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    const sessionId = `mock_cs_${params.orderId}_${randomBytes(4).toString('hex')}`;
    const checkoutUrl = `${this.config.webAppUrl}/checkout/complete?orderId=${params.orderId}&session=${sessionId}`;
    return { checkoutUrl, providerSessionId: sessionId };
  }

  verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined): PaymentWebhookEvent | null {
    if (!signatureHeader) {
      return null;
    }
    const expected = createHmac('sha256', this.config.paymentWebhookSecret)
      .update(rawBody)
      .digest('hex');
    const provided = signatureHeader.replace(/^sha256=/, '');
    try {
      if (
        expected.length !== provided.length ||
        !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))
      ) {
        return null;
      }
    } catch {
      return null;
    }

    try {
      const payload = JSON.parse(rawBody.toString('utf8')) as {
        eventId?: unknown;
        type?: unknown;
        orderId?: unknown;
        paymentStatus?: unknown;
        providerPaymentId?: unknown;
        providerSubscriptionId?: unknown;
        currentPeriodEnd?: unknown;
      };
      if (
        typeof payload.eventId !== 'string' ||
        typeof payload.type !== 'string' ||
        typeof payload.orderId !== 'string' ||
        (payload.paymentStatus !== 'succeeded' && payload.paymentStatus !== 'failed') ||
        typeof payload.providerPaymentId !== 'string'
      ) {
        return null;
      }
      return {
        eventId: payload.eventId,
        type: payload.type,
        orderId: payload.orderId,
        paymentStatus: payload.paymentStatus,
        providerPaymentId: payload.providerPaymentId,
        providerSubscriptionId:
          typeof payload.providerSubscriptionId === 'string'
            ? payload.providerSubscriptionId
            : undefined,
        currentPeriodEnd:
          typeof payload.currentPeriodEnd === 'string' ? payload.currentPeriodEnd : undefined,
      };
    } catch {
      return null;
    }
  }
}
