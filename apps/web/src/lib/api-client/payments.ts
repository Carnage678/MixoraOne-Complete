import type {
  CheckoutSessionResult,
  CreateCheckoutSessionInput,
  OrderDetail,
  OrderSummary,
  SubscriptionRecord,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function createCheckoutSession(
  accessToken: string,
  input: CreateCheckoutSessionInput,
  idempotencyKey?: string,
): Promise<CheckoutSessionResult> {
  return apiRequest<CheckoutSessionResult>('/checkout/sessions', {
    method: 'POST',
    body: input,
    accessToken,
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : undefined,
  });
}

export function listOrders(accessToken: string): Promise<OrderSummary[]> {
  return apiRequest<OrderSummary[]>('/orders', { accessToken });
}

export function getOrder(accessToken: string, orderId: string): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/orders/${orderId}`, { accessToken });
}

export function listSubscriptions(accessToken: string): Promise<SubscriptionRecord[]> {
  return apiRequest<SubscriptionRecord[]>('/subscriptions', { accessToken });
}

export function cancelSubscription(
  accessToken: string,
  subscriptionId: string,
): Promise<SubscriptionRecord> {
  return apiRequest<SubscriptionRecord>(`/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    accessToken,
  });
}
