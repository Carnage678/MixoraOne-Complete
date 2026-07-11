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

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let devToken: string;
  let adminToken: string;
  let productId: string;
  let productSlug: string;
  let planId: string;

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken;
  }

  async function loginAsAdmin(): Promise<string> {
    prismaFake.users.find((row) => row.email === 'analytics-admin@mixora.one')!.role = 'ADMIN';
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'analytics-admin@mixora.one', password: 'a-strong-password' })
      .expect(200);
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

    await register('analytics-admin@mixora.one', 'Analytics Admin');
    adminToken = await loginAsAdmin();
    devToken = await register('analytics-dev@mixora.one', 'Analytics Dev');
    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ displayName: 'Analytics Studio' })
      .expect(201);
    const devLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'analytics-dev@mixora.one', password: 'a-strong-password' })
      .expect(200);
    devToken = devLogin.body.data.tokens.accessToken;

    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Analytics App' })
      .expect(201);
    productId = product.body.data.id;
    productSlug = product.body.data.slug;
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('authorization', `Bearer ${devToken}`)
      .send({
        description:
          'Analytics App tracks marketplace funnel metrics and developer product performance.',
      })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/versions`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ semver: '1.0.0' })
      .expect(201);
    const plan = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Pro', type: 'ONE_TIME', priceCents: 14900 })
      .expect(201);
    planId = plan.body.data.id;
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('records product view and search analytics events', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/marketplace/products/${productSlug}`)
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/marketplace/search')
      .query({ q: 'Analytics' })
      .expect(200);

    expect(prismaFake.analyticsEvents.some((event) => event.name === 'product.view')).toBe(true);
    expect(prismaFake.analyticsEvents.some((event) => event.name === 'search.query')).toBe(true);
  });

  it('records order paid analytics after checkout', async () => {
    const buyerToken = await register('analytics-buyer@mixora.one', 'Analytics Buyer');
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ pricingPlanId: planId })
      .expect(201);
    const orderId = checkout.body.data.orderId;
    const payload = JSON.stringify({
      eventId: `evt_${orderId}`,
      type: 'checkout.session.completed',
      orderId,
      paymentStatus: 'succeeded',
      providerPaymentId: `pay_${orderId}`,
    });
    await request(app.getHttpServer())
      .post('/api/v1/payments/webhooks/mock')
      .set('content-type', 'application/json')
      .set('x-mixora-signature', signWebhook(payload))
      .send(JSON.parse(payload))
      .expect(201);

    expect(prismaFake.analyticsEvents.some((event) => event.name === 'order.paid')).toBe(true);
    expect(prismaFake.productDailyMetrics.some((metric) => metric.orders > 0)).toBe(true);
  });

  it('returns developer analytics overview and product detail', async () => {
    const overview = await request(app.getHttpServer())
      .get('/api/v1/analytics/developer/overview')
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
    expect(overview.body.data.totalViews).toBeGreaterThanOrEqual(1);
    expect(overview.body.data.products).toHaveLength(1);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/analytics/developer/products/${productId}`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
    expect(detail.body.data.productId).toBe(productId);
    expect(detail.body.data.totals.views).toBeGreaterThanOrEqual(1);
  });

  it('returns admin overview and marketplace funnel', async () => {
    const overview = await request(app.getHttpServer())
      .get('/api/v1/analytics/admin/overview')
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(overview.body.data.totalProducts).toBeGreaterThanOrEqual(1);

    const funnel = await request(app.getHttpServer())
      .get('/api/v1/analytics/marketplace/funnel')
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(funnel.body.data.productViews).toBeGreaterThanOrEqual(1);
  });
});
