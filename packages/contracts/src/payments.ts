import type { BillingInterval, PricingType } from './products';

export const ORDER_STATUSES = ['PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = ['ACTIVE', 'PAST_DUE', 'CANCELLED', 'INCOMPLETE'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const INVOICE_STATUSES = ['DRAFT', 'OPEN', 'PAID', 'VOID'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface OrderItem {
  id: string;
  productId: string;
  pricingPlanId: string;
  productName: string;
  planName: string;
  pricingType: PricingType;
  quantity: number;
  unitPriceCents: number;
  currency: string;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  createdAt: string;
  itemCount: number;
  primaryProductName: string | null;
}

export interface OrderDetail extends OrderSummary {
  items: OrderItem[];
  payments: PaymentRecord[];
  invoice: InvoiceRecord | null;
}

export interface PaymentRecord {
  id: string;
  provider: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  status: InvoiceStatus;
  amountCents: number;
  currency: string;
  issuedAt: string;
  paidAt: string | null;
}

export interface SubscriptionRecord {
  id: string;
  productId: string;
  productName: string;
  planName: string;
  status: SubscriptionStatus;
  interval: BillingInterval | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface CreateCheckoutSessionInput {
  pricingPlanId: string;
  successPath?: string;
  cancelPath?: string;
}

export interface CheckoutSessionResult {
  orderId: string;
  checkoutUrl: string | null;
  status: OrderStatus;
  provider: string;
}
