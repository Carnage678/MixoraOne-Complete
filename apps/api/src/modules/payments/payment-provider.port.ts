export interface CreateCheckoutParams {
  orderId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  productName: string;
  planName: string;
  mode: 'payment' | 'subscription';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  providerSessionId: string;
}

export interface PaymentWebhookEvent {
  eventId: string;
  type: string;
  orderId: string;
  paymentStatus: 'succeeded' | 'failed';
  providerPaymentId: string;
  providerSubscriptionId?: string;
  currentPeriodEnd?: string;
}

/**
 * Port every payment vendor adapter implements. Checkout and webhook handling
 * depend only on this interface so mock/Stripe can be swapped via config.
 */
export interface PaymentProviderPort {
  readonly name: string;
  isConfigured(): boolean;
  createCheckoutSession(params: CreateCheckoutParams): Promise<CheckoutSessionResult>;
  verifyWebhook(rawBody: Buffer, signatureHeader: string | undefined): PaymentWebhookEvent | null;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
