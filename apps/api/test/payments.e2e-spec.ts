import { createHmac } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { PrismaFake } from './support/prisma-fake';

const WEBHOOK_SECRET = 'dev-webhook-secret-change-me';

function signWebhook(body: string): string {
  return createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

describe('Payments and checkout (e2e, mock provider)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let buyerToken: string;
  let planId: string;
  let freePlanId: string;
  let subscriptionPlanId: string;

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken;
  }

  beforeAll(async () => {
    prismaFake = new PrismaFake();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaFake)
      .overrideProvider(RedisService)
      .useValue({
        isHealthy: async () => true,
        client: { incr: async () => 1, expire: async () => 1 },
      })
      .compile();

    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    buyerToken = await register('buyer-pay@mixora.one', 'Buyer Pay');
    const devToken = await register('seller-pay@mixora.one', 'Seller Pay');
    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ displayName: 'Pay Studio' })
      .expect(201);

    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Pay Pilot' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.body.data.id}`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ description: 'Pay Pilot helps finance teams automate billing workflows with confidence.' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/versions`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ semver: '1.0.0' })
      .expect(201);

    const paidPlan = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Pro', type: 'ONE_TIME', priceCents: 9900 })
      .expect(201);
    planId = paidPlan.body.data.id;

    const freePlan = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Community', type: 'FREE', priceCents: 0 })
      .expect(201);
    freePlanId = freePlan.body.data.id;

    const subPlan = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Monthly', type: 'SUBSCRIPTION', priceCents: 2900, interval: 'MONTH' })
      .expect(201);
    subscriptionPlanId = subPlan.body.data.id;

    await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/publish`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a pending checkout session for a paid plan', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ pricingPlanId: planId })
      .expect(201);

    expect(response.body.data.status).toBe('PENDING');
    expect(response.body.data.checkoutUrl).toContain('/checkout/complete');
    expect(response.body.data.provider).toBe('mock');
  });

  it('completes checkout through a signed webhook and exposes the paid order', async () => {
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ pricingPlanId: planId })
      .expect(201);
    const orderId = checkout.body.data.orderId;

    const payload = JSON.stringify({
      eventId: 'evt_test_paid_1',
      type: 'checkout.session.completed',
      orderId,
      paymentStatus: 'succeeded',
      providerPaymentId: 'pay_test_1',
    });
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mixora-signature', signWebhook(payload))
      .send(JSON.parse(payload))
      .expect(201);

    const order = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderId}`)
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(order.body.data.status).toBe('PAID');
    expect(order.body.data.invoice?.status).toBe('PAID');
    expect(order.body.data.payments[0].status).toBe('SUCCEEDED');
  });

  it('deduplicates webhook events by provider event id', async () => {
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ pricingPlanId: planId })
      .expect(201);
    const orderId = checkout.body.data.orderId;
    const payload = JSON.stringify({
      eventId: 'evt_test_duplicate',
      type: 'checkout.session.completed',
      orderId,
      paymentStatus: 'succeeded',
      providerPaymentId: 'pay_test_dup',
    });

    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mixora-signature', signWebhook(payload))
      .send(JSON.parse(payload))
      .expect(201);

    const replay = await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mixora-signature', signWebhook(payload))
      .send(JSON.parse(payload))
      .expect(201);

    expect(replay.body.data.duplicate).toBe(true);
  });

  it('honors checkout idempotency keys', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .set('idempotency-key', 'buy-pay-pilot-once')
      .send({ pricingPlanId: planId })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .set('idempotency-key', 'buy-pay-pilot-once')
      .send({ pricingPlanId: planId })
      .expect(201);

    expect(second.body.data.orderId).toBe(first.body.data.orderId);
  });

  it('fulfills free plans immediately without a checkout redirect', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ pricingPlanId: freePlanId })
      .expect(201);

    expect(response.body.data.status).toBe('PAID');
    expect(response.body.data.checkoutUrl).toContain('/orders/');
  });

  it('creates a subscription when a subscription plan is paid', async () => {
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ pricingPlanId: subscriptionPlanId })
      .expect(201);
    const orderId = checkout.body.data.orderId;
    const payload = JSON.stringify({
      eventId: 'evt_test_sub_1',
      type: 'checkout.session.completed',
      orderId,
      paymentStatus: 'succeeded',
      providerPaymentId: 'pay_test_sub',
      providerSubscriptionId: 'sub_test_1',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mixora-signature', signWebhook(payload))
      .send(JSON.parse(payload))
      .expect(201);

    const subscriptions = await request(app.getHttpServer())
      .get('/api/v1/subscriptions')
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(subscriptions.body.data.some((entry: { status: string }) => entry.status === 'ACTIVE')).toBe(
      true,
    );
  });

  it('rejects unsigned webhooks', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .send({
        eventId: 'evt_bad_sig',
        type: 'checkout.session.completed',
        orderId: '00000000-0000-0000-0000-000000000000',
        paymentStatus: 'succeeded',
        providerPaymentId: 'pay_bad',
      })
      .expect(400);
  });
});
