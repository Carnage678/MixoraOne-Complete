import { Module } from '@nestjs/common';

import { AppConfigService } from '../../core/config/app-config.service';
import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { LicensingModule } from '../licensing/licensing.module';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { MockPaymentProvider } from './mock-payment.provider';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentWebhooksController } from './payment-webhooks.controller';
import { PAYMENT_PROVIDER, PaymentProviderPort } from './payment-provider.port';
import { StripePaymentProvider } from './stripe-payment.provider';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { WebhookService } from './webhook.service';

const paymentProviderFactory = {
  provide: PAYMENT_PROVIDER,
  useFactory: (
    config: AppConfigService,
    mock: MockPaymentProvider,
    stripe: StripePaymentProvider,
  ): PaymentProviderPort => {
    switch (config.paymentProvider) {
      case 'stripe':
        return stripe;
      case 'mock':
      default:
        return mock;
    }
  },
  inject: [AppConfigService, MockPaymentProvider, StripePaymentProvider],
};

@Module({
  imports: [LicensingModule, AnalyticsModule],
  controllers: [
    CheckoutController,
    OrdersController,
    SubscriptionsController,
    PaymentWebhooksController,
  ],
  providers: [
    MockPaymentProvider,
    StripePaymentProvider,
    paymentProviderFactory,
    CheckoutService,
    OrdersService,
    SubscriptionsService,
    WebhookService,
    RateLimitService,
  ],
  exports: [CheckoutService, OrdersService],
})
export class PaymentsModule {}
