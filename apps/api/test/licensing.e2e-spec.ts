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

describe('Licensing and entitlements (e2e)', () => {
  let app: INestApplication;
  let buyerToken: string;
  let teammateToken: string;
  let intruderToken: string;
  let teamPlanId: string;
  let licenseId: string;

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken;
  }

  async function payForPlan(token: string, pricingPlanId: string): Promise<string> {
    const checkout = await request(app.getHttpServer())
      .post('/api/v1/checkout/sessions')
      .set('authorization', `Bearer ${token}`)
      .send({ pricingPlanId })
      .expect(201);
    const orderId = checkout.body.data.orderId;
    if (checkout.body.data.status === 'PAID') {
      return orderId;
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
    return orderId;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(new PrismaFake())
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

    buyerToken = await register('license-buyer@mixora.one', 'License Buyer');
    teammateToken = await register('license-seat@mixora.one', 'Seat Mate');
    intruderToken = await register('license-intruder@mixora.one', 'Intruder');

    const devToken = await register('license-dev@mixora.one', 'License Dev');
    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ displayName: 'License Studio' })
      .expect(201);
    const product = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Entitlement App' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${product.body.data.id}`)
      .set('authorization', `Bearer ${devToken}`)
      .send({
        description:
          'Entitlement App ships license keys, seat management, and device activation for teams.',
      })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/versions`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ semver: '1.0.0' })
      .expect(201);
    const teamPlan = await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Team', type: 'ONE_TIME', priceCents: 19900, seats: 2 })
      .expect(201);
    teamPlanId = teamPlan.body.data.id;
    await request(app.getHttpServer())
      .post(`/api/v1/products/${product.body.data.id}/publish`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('grants a license when a paid order completes', async () => {
    await payForPlan(buyerToken, teamPlanId);
    const licenses = await request(app.getHttpServer())
      .get('/api/v1/licenses')
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(licenses.body.data).toHaveLength(1);
    expect(licenses.body.data[0].seatLimit).toBe(2);
    expect(licenses.body.data[0].status).toBe('ACTIVE');
    licenseId = licenses.body.data[0].id;
  });

  it('returns entitlements for an authorized user', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/licenses/${licenseId}/entitlements`)
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(200);

    expect(response.body.data.valid).toBe(true);
    expect(response.body.data.features).toContain('access');
  });

  it('activates a device and allows deactivation', async () => {
    const activation = await request(app.getHttpServer())
      .post(`/api/v1/licenses/${licenseId}/activate`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ deviceId: 'device-workstation-1', deviceName: 'Finance laptop' })
      .expect(201);

    expect(activation.body.data.activationToken).toMatch(/^mx_act_/);

    await request(app.getHttpServer())
      .post(`/api/v1/licenses/${licenseId}/deactivate`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ activationId: activation.body.data.activationId })
      .expect(201);
  });

  it('assigns a seat to another user and exposes it in their license list', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/licenses/${licenseId}/seats`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ email: 'license-seat@mixora.one' })
      .expect(201);

    const teammateLicenses = await request(app.getHttpServer())
      .get('/api/v1/licenses')
      .set('authorization', `Bearer ${teammateToken}`)
      .expect(200);

    expect(teammateLicenses.body.data.some((entry: { id: string }) => entry.id === licenseId)).toBe(
      true,
    );
  });

  it('enforces seat limits and blocks non-owners from seat management', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/licenses/${licenseId}/seats`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ email: 'license-intruder@mixora.one' })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/v1/licenses/${licenseId}/seats`)
      .set('authorization', `Bearer ${intruderToken}`)
      .expect(403);
  });
});
