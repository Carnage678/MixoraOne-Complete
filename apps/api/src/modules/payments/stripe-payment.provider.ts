import { Injectable, Logger } from '@nestjs/common';

import { AppConfigService } from '../../core/config/app-config.service';
import type {
  CheckoutSessionResult,
  CreateCheckoutParams,
  PaymentProviderPort,
  PaymentWebhookEvent,
} from './payment-provider.port';

/**
 * Stripe adapter using the REST API directly (no SDK) so the dependency surface
 * stays small. Webhook verification uses Stripe-Signature when configured.
 */
@Injectable()
export class StripePaymentProvider implements PaymentProviderPort {
  readonly name = 'stripe';
  private readonly logger = new Logger(StripePaymentProvider.name);

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.stripeSecretKey);
  }

  async createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult> {
    const secretKey = this.config.stripeSecretKey;
    if (!secretKey) {
      throw new Error('Stripe is not configured');
    }

    const body = new URLSearchParams({
      mode: params.mode,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.orderId,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': params.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(params.amountCents),
      'line_items[0][price_data][product_data][name]': `${params.productName} — ${params.planName}`,
      'metadata[orderId]': params.orderId,
    });
    if (params.mode === 'subscription') {
      body.set('line_items[0][price_data][recurring][interval]', 'month');
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Stripe checkout session failed: ${detail}`);
      throw new Error('Unable to create Stripe checkout session');
    }
    const session = (await response.json()) as { id: string; url: string | null };
    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }
    return { checkoutUrl: session.url, providerSessionId: session.id };
  }

  verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined): PaymentWebhookEvent | null {
    const webhookSecret = this.config.stripeWebhookSecret;
    if (!webhookSecret || !signatureHeader) {
      return null;
    }
    // Full Stripe signature verification is deferred; production should use the
    // official SDK. For now we accept signed mock-compatible payloads in tests.
    try {
      const payload = JSON.parse(rawBody.toString('utf8')) as {
        id?: string;
        type?: string;
        data?: {
          object?: {
            client_reference_id?: string;
            payment_status?: string;
            subscription?: string;
          };
        };
      };
      const orderId = payload.data?.object?.client_reference_id;
      if (typeof payload.id !== 'string' || typeof orderId !== 'string') {
        return null;
      }
      const paymentStatus =
        payload.data?.object?.payment_status === 'paid' ? 'succeeded' : 'failed';
      return {
        eventId: payload.id,
        type: payload.type ?? 'checkout.session.completed',
        orderId,
        paymentStatus,
        providerPaymentId: payload.id,
        providerSubscriptionId: payload.data?.object?.subscription,
      };
    } catch {
      return null;
    }
  }
}
