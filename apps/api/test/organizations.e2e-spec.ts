import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { PrismaFake } from './support/prisma-fake';

describe('Users and organizations (e2e, in-memory persistence)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let memberUserId: string;
  let organizationId: string;

  async function registerAndGetToken(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken as string;
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

    ownerToken = await registerAndGetToken('owner@mixora.one', 'Owner');
    memberToken = await registerAndGetToken('member@mixora.one', 'Member');
    outsiderToken = await registerAndGetToken('outsider@mixora.one', 'Outsider');
    memberUserId = prismaFake.users.find((row) => row.email === 'member@mixora.one')!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('updates the profile name and audits it', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Owner Renamed' })
      .expect(200);
    expect(response.body.data.name).toBe('Owner Renamed');
    expect(prismaFake.auditLogs.some((row) => row.action === 'user.profile_updated')).toBe(true);
  });

  it('rejects unknown fields in profile updates', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ role: 'ADMIN' })
      .expect(400);
  });

  it('creates an organization with the creator as owner', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Mixora Labs' })
      .expect(201);

    expect(response.body.data.slug).toBe('mixora-labs');
    expect(response.body.data.myRole).toBe('OWNER');
    expect(response.body.data.memberCount).toBe(1);
    organizationId = response.body.data.id;
  });

  it('generates a unique slug on name collision', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('authorization', `Bearer ${outsiderToken}`)
      .send({ name: 'Mixora Labs' })
      .expect(201);
    expect(response.body.data.slug).toMatch(/^mixora-labs-[0-9a-f]{6}$/);
  });

  it('owners add members by email', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ email: 'member@mixora.one' })
      .expect(201);
    expect(response.body.data.role).toBe('MEMBER');

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ email: 'member@mixora.one' })
      .expect(409);

    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members`)
      .set('authorization', `Bearer ${ownerToken}`)
      .send({ email: 'nobody@mixora.one' })
      .expect(404);
  });

  it('members can list the roster; outsiders cannot', async () => {
    const roster = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set('authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(roster.body.data).toHaveLength(2);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set('authorization', `Bearer ${outsiderToken}`)
      .expect(403);
  });

  it('members cannot add other members', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members`)
      .set('authorization', `Bearer ${memberToken}`)
      .send({ email: 'outsider@mixora.one' })
      .expect(403);
  });

  it('lists organizations with my role and member count', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].myRole).toBe('MEMBER');
    expect(response.body.data[0].memberCount).toBe(2);
  });

  it('blocks removing the last owner but allows a member to leave', async () => {
    const ownerUserId = prismaFake.users.find((row) => row.email === 'owner@mixora.one')!.id;

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${ownerUserId}`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${memberUserId}`)
      .set('authorization', `Bearer ${memberToken}`)
      .expect(204);

    const roster = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set('authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(roster.body.data).toHaveLength(1);
  });

  it('requires authentication for all organization routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/organizations').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .send({ name: 'X' })
      .expect(401);
  });
});
