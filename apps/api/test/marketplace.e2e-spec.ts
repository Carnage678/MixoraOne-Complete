import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { PrismaFake } from './support/prisma-fake';

describe('Marketplace discovery (e2e, in-memory persistence)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let devToken: string;
  let buyerToken: string;
  let adminToken: string;
  const productIds: string[] = [];

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken;
  }

  async function createPublishedProduct(name: string, description: string): Promise<string> {
    const created = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name })
      .expect(201);
    const id = created.body.data.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/products/${id}`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ description })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${id}/versions`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ semver: '1.0.0' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${id}/pricing-plans`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Standard', type: 'ONE_TIME', priceCents: 2500 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/products/${id}/publish`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
    return id;
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

    devToken = await register('seller@mixora.one', 'Seller');
    buyerToken = await register('shopper@mixora.one', 'Shopper');
    adminToken = await register('admin@mixora.one', 'Admin');
    prismaFake.users.find((row) => row.email === 'admin@mixora.one')!.role = 'ADMIN';
    adminToken = (
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@mixora.one', password: 'a-strong-password' })
        .expect(200)
    ).body.data.tokens.accessToken;

    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ displayName: 'Seller Studio' })
      .expect(201);

    productIds.push(
      await createPublishedProduct(
        'Ledger Pilot',
        'Ledger Pilot keeps double-entry books accurate with automated reconciliation for finance teams.',
      ),
    );
    productIds.push(
      await createPublishedProduct(
        'Support Radar',
        'Support Radar routes customer tickets with AI triage, SLA tracking, and satisfaction analytics.',
      ),
    );
    productIds.push(
      await createPublishedProduct(
        'Inventory Hawk',
        'Inventory Hawk forecasts stock levels and automates purchase orders for retail chains.',
      ),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('admins create categories; everyone can list them', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('authorization', `Bearer ${adminToken}`)
      .send({ name: 'Finance' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('authorization', `Bearer ${adminToken}`)
      .send({ name: 'Customer Support' })
      .expect(201);

    // Non-admins are rejected.
    await request(app.getHttpServer())
      .post('/api/v1/admin/categories')
      .set('authorization', `Bearer ${devToken}`)
      .send({ name: 'Hacked' })
      .expect(403);

    const list = await request(app.getHttpServer())
      .get('/api/v1/marketplace/categories')
      .expect(200);
    expect(list.body.data.map((category: { slug: string }) => category.slug)).toEqual([
      'customer-support',
      'finance',
    ]);
  });

  it('owners assign categories to products', async () => {
    const response = await request(app.getHttpServer())
      .put(`/api/v1/products/${productIds[0]}/categories`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ slugs: ['finance'] })
      .expect(200);
    expect(response.body.data).toEqual([{ slug: 'finance', name: 'Finance' }]);

    await request(app.getHttpServer())
      .put(`/api/v1/products/${productIds[1]}/categories`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ slugs: ['customer-support'] })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/v1/products/${productIds[0]}/categories`)
      .set('authorization', `Bearer ${buyerToken}`)
      .send({ slugs: ['finance'] })
      .expect(403);

    await request(app.getHttpServer())
      .put(`/api/v1/products/${productIds[0]}/categories`)
      .set('authorization', `Bearer ${devToken}`)
      .send({ slugs: ['does-not-exist'] })
      .expect(400);
  });

  it('browses all published products without auth', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/marketplace/search')
      .expect(200);
    expect(response.body.data.items).toHaveLength(3);
    expect(response.body.data.nextCursor).toBeNull();
    expect(response.body.data.items[0].developer.displayName).toBe('Seller Studio');
    expect(response.body.data.items[0].fromPriceCents).toBe(2500);
  });

  it('searches by text and records a search event', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/marketplace/search?q=reconciliation')
      .expect(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].name).toBe('Ledger Pilot');
    expect(
      prismaFake.searchEvents.some(
        (row) => row.query === 'reconciliation' && row.resultCount === 1,
      ),
    ).toBe(true);
  });

  it('filters by category', async () => {
    const finance = await request(app.getHttpServer())
      .get('/api/v1/marketplace/search?category=finance')
      .expect(200);
    expect(finance.body.data.items.map((item: { name: string }) => item.name)).toEqual([
      'Ledger Pilot',
    ]);

    const unknown = await request(app.getHttpServer())
      .get('/api/v1/marketplace/search?category=nope')
      .expect(200);
    expect(unknown.body.data.items).toHaveLength(0);
  });

  it('paginates with a cursor', async () => {
    const first = await request(app.getHttpServer())
      .get('/api/v1/marketplace/search?limit=2')
      .expect(200);
    expect(first.body.data.items).toHaveLength(2);
    expect(first.body.data.nextCursor).toBeTruthy();

    const second = await request(app.getHttpServer())
      .get(`/api/v1/marketplace/search?limit=2&cursor=${first.body.data.nextCursor}`)
      .expect(200);
    expect(second.body.data.items).toHaveLength(1);
    expect(second.body.data.nextCursor).toBeNull();

    const firstSlugs = first.body.data.items.map((item: { slug: string }) => item.slug);
    const secondSlugs = second.body.data.items.map((item: { slug: string }) => item.slug);
    expect(new Set([...firstSlugs, ...secondSlugs]).size).toBe(3);
  });

  it('sorts by name', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/marketplace/search?sort=name')
      .expect(200);
    expect(response.body.data.items.map((item: { name: string }) => item.name)).toEqual([
      'Inventory Hawk',
      'Ledger Pilot',
      'Support Radar',
    ]);
  });

  it('manages favorites end to end', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/marketplace/favorites/${productIds[0]}`)
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(204);

    // Duplicate save is rejected.
    await request(app.getHttpServer())
      .post(`/api/v1/marketplace/favorites/${productIds[0]}`)
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(409);

    const favorites = await request(app.getHttpServer())
      .get('/api/v1/marketplace/favorites')
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(favorites.body.data).toHaveLength(1);
    expect(favorites.body.data[0].name).toBe('Ledger Pilot');

    const slugs = await request(app.getHttpServer())
      .get('/api/v1/marketplace/favorites/slugs')
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(200);
    expect(slugs.body.data).toEqual(['ledger-pilot']);

    await request(app.getHttpServer())
      .delete(`/api/v1/marketplace/favorites/${productIds[0]}`)
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .delete(`/api/v1/marketplace/favorites/${productIds[0]}`)
      .set('authorization', `Bearer ${buyerToken}`)
      .expect(404);
  });

  it('requires auth for favorites and hides archived products from search', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/marketplace/favorites/${productIds[0]}`)
      .expect(401);

    await request(app.getHttpServer())
      .post(`/api/v1/products/${productIds[2]}/archive`)
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/v1/marketplace/search')
      .expect(200);
    expect(response.body.data.items.map((item: { name: string }) => item.name)).not.toContain(
      'Inventory Hawk',
    );
  });
});
