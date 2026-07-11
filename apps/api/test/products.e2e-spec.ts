import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { PrismaFake } from './support/prisma-fake';

describe('Product listings (e2e, in-memory persistence)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let devToken: string;
  let otherDevToken: string;
  let buyerToken: string;
  let productId: string;

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken;
  }

  async function createDeveloperProfile(token: string, displayName: string): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${token}`)
      .send({ displayName })
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

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    devToken = await register('studio@mixora.one', 'Studio');
    otherDevToken = await register('rival@mixora.one', 'Rival');
    buyerToken = await register('buyer@mixora.one', 'Buyer');
    await createDeveloperProfile(devToken, 'Studio One');
    await createDeveloperProfile(otherDevToken, 'Rival Dev');
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a developer profile to create products', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ name: 'Nope' })
      .expect(403);
  });

  it('creates a draft product', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Invoice Ninja Pro', tagline: 'Invoicing that fights back' })
      .expect(201);

    expect(response.body.data.status).toBe('DRAFT');
    expect(response.body.data.slug).toBe('invoice-ninja-pro');
    productId = response.body.data.id;
  });

  it('blocks publishing until the policy is satisfied', async () => {
    const attempt = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(400);
    expect(attempt.body.error.message).toContain('Cannot publish yet');

    // Fill in the requirements: description, version, active plan.
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('authorization', `Bearer ${devToken}`)
      .send({
        description:
          'Invoice Ninja Pro automates invoicing, payment reminders, and reconciliation for small teams.',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/versions`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ semver: '1.0.0', changelog: 'Initial release' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Pro', type: 'ONE_TIME', priceCents: 4900 })
      .expect(201);

    const published = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/publish`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
    expect(published.body.data.status).toBe('PUBLISHED');
    expect(published.body.data.publishedAt).toBeTruthy();
    expect(
      prismaFake.productStatusHistories.some(
        (row) => row.fromStatus === 'DRAFT' && row.toStatus === 'PUBLISHED',
      ),
    ).toBe(true);
  });

  it('rejects duplicate and malformed versions', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/versions`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ semver: '1.0.0' })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/versions`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ semver: 'not-semver' })
      .expect(400);
  });

  it('enforces pricing plan rules', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Sub', type: 'SUBSCRIPTION', priceCents: 900 })
      .expect(400); // missing interval

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Paid', type: 'ONE_TIME', priceCents: 0 })
      .expect(400); // zero price
  });

  it('enforces ownership on management endpoints', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/products/${productId}`)
      .set('authorization', `Bearer ${otherDevToken}`)
      .send({ name: 'Hijacked' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/versions`)
      .set('authorization', `Bearer ${otherDevToken}`)
      .send({ semver: '9.9.9' })
      .expect(403);
  });

  it('serves the public product page with developer, versions, and plans', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/assets`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ kind: 'SCREENSHOT', title: 'Dashboard', url: 'https://cdn.mixora.one/shot.png' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/docs`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ title: 'Getting Started', content: '# Install\nRun the installer.' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/api/v1/marketplace/products/invoice-ninja-pro')
      .expect(200);

    const product = response.body.data;
    expect(product.name).toBe('Invoice Ninja Pro');
    expect(product.developer.displayName).toBe('Studio One');
    expect(product.versions).toHaveLength(1);
    expect(product.assets).toHaveLength(1);
    expect(product.docs[0].slug).toBe('getting-started');
    expect(product.pricingPlans).toHaveLength(1);
  });

  it('hides drafts and archived products from the public endpoint', async () => {
    const draft = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Secret Draft' })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/marketplace/products/${draft.body.data.slug}`)
      .expect(404);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/archive`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/v1/marketplace/products/invoice-ninja-pro')
      .expect(404);
  });

  it('deactivating the only plan is possible after publish (unpublish is explicit)', async () => {
    const plans = await request(app.getHttpServer())
      .get(`/api/v1/products/${productId}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
    const planId = plans.body.data[0].id;

    const deactivated = await request(app.getHttpServer())
      .post(`/api/v1/products/${productId}/pricing-plans/${planId}/deactivate`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
    expect(deactivated.body.data.isActive).toBe(false);
  });
});
