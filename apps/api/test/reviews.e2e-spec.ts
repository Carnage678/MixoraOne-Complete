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

describe('Reviews and Q&A (e2e)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let buyerToken: string;
  let devToken: string;
  let productId: string;
  let productSlug: string;
  let planId: string;
  let reviewId: string;
  let questionId: string;

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken;
  }

  async function payForPlan(token: string, pricingPlanId: string): Promise<void> {
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${token}`)
      .send({ pricingPlanId })
      .expect(201);
    const orderId = checkout.body.data.orderId;
    if (checkout.body.data.status === 'PAID') {
      return;
    }
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

    buyerToken = await register('review-buyer@mixora.one', 'Review Buyer');
    devToken = await register('review-dev@mixora.one', 'Review Dev');
    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ displayName: 'Review Studio' })
      .expect(201);

    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Review App' })
      .expect(201);
    productId = product.body.data.id;
    productSlug = product.body.data.slug;
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('authorization', `Bearer ${devToken}`)
      .send({
        description:
          'Review App helps teams collect verified purchase feedback and answer buyer questions.',
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
      .send({ name: 'Standard', type: 'ONE_TIME', priceCents: 9900 })
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

  it('rejects reviews without a verified purchase', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/reviews`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ rating: 5, body: 'Great product with excellent support and fast onboarding.' })
      .expect(403);
  });

  it('creates a verified review after purchase', async () => {
    await payForPlan(buyerToken, planId);
    const response = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/reviews`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({
        rating: 5,
        title: 'Worth it',
        body: 'Great product with excellent support and fast onboarding.',
      })
      .expect(201);

    expect(response.body.data.verifiedPurchase).toBe(true);
    expect(response.body.data.rating).toBe(5);
    reviewId = response.body.data.id;
  });

  it('lists published reviews publicly', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/reviews`)
      .expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].userName).toBe('Review Buyer');
  });

  it('allows the developer to reply to a review', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/reviews/${reviewId}/replies`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ body: 'Thanks for the kind words!' })
      .expect(201);

    expect(response.body.data.replies).toHaveLength(1);
    expect(response.body.data.replies[0].developerDisplayName).toBe('Review Studio');
  });

  it('supports product Q&A', async () => {
    const question = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/questions`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({
        title: 'Seat licensing',
        body: 'Does the standard plan include multi-seat licensing for teams?',
      })
      .expect(201);
    questionId = question.body.data.id;

    const listed = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/questions`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);

    const answered = await request(app.getHttpServer())
      .post(`/api/v1/questions/${questionId}/answers`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ body: 'Yes, seat licensing is included in the standard plan.' })
      .expect(201);
    expect(answered.body.data.answers).toHaveLength(1);
  });

  it('accepts feedback and reports', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/feedback')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({
        subject: 'Feature request',
        body: 'Would love dark mode in the dashboard for late-night usage.',
        productId,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({
        targetType: 'REVIEW',
        targetId: reviewId,
        reason: 'Spam',
        details: 'Looks automated',
      })
      .expect(201);
  });

  it('records a product view analytics event', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/marketplace/products/${productSlug}`)
      .expect(200);

    expect(prismaFake.analyticsEvents.some((event) => event.name === 'product.view')).toBe(true);
  });
});
