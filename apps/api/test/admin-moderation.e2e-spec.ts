import { randomUUID } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { PrismaFake } from './support/prisma-fake';

describe('Admin trust and moderation (e2e)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let adminToken: string;
  let userToken: string;
  let trustCheckId: string;
  let moderationCaseId: string;
  let disputeId: string;
  let developerProfileId: string;

  async function register(email: string, name: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'a-strong-password', name })
      .expect(201);
    return response.body.data.tokens.accessToken;
  }

  async function loginAsAdmin(): Promise<string> {
    prismaFake.users.find((row) => row.email === 'admin-mod@mixora.one')!.role = 'ADMIN';
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin-mod@mixora.one', password: 'a-strong-password' })
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

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    await register('admin-mod@mixora.one', 'Admin Mod');
    adminToken = await loginAsAdmin();
    userToken = await register('reporter-mod@mixora.one', 'Reporter');

    const devToken = await register('trust-dev@mixora.one', 'Trust Dev');
    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ displayName: 'Trust Studio' })
      .expect(201);
    developerProfileId = prismaFake.developerProfiles[0].id;

    trustCheckId = randomUUID();
    prismaFake.trustChecks.push({
      id: trustCheckId,
      kind: 'DEVELOPER',
      subjectType: 'developer_profile',
      subjectId: developerProfileId,
      status: 'PENDING',
      evidence: 'https://example.com/evidence',
      decidedByUserId: null,
      decisionNote: null,
      createdAt: new Date(),
      decidedAt: null,
    });

    await request(app.getHttpServer())
      .post('/api/v1/reports')
      .set('authorization', `Bearer ${userToken}`)
      .send({
        targetType: 'USER',
        targetId: prismaFake.users.find((row) => row.email === 'reporter-mod@mixora.one')!.id,
        reason: 'Harassment',
      })
      .expect(201);
    moderationCaseId = prismaFake.moderationCases[0].id;

    disputeId = randomUUID();
    prismaFake.disputes.push({
      id: disputeId,
      orderId: null,
      reporterUserId: prismaFake.users.find((row) => row.email === 'reporter-mod@mixora.one')!.id,
      respondentUserId: null,
      reason: 'Charge not recognized',
      status: 'OPEN',
      resolution: null,
      createdAt: new Date(),
      resolvedAt: null,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects admin endpoints for non-admins', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/trust-checks')
      .set('authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('lists trust checks and records a decision', async () => {
    const listed = await request(app.getHttpServer())
      .get('/api/v1/admin/trust-checks')
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);

    const decided = await request(app.getHttpServer())
      .post(`/api/v1/admin/trust-checks/${trustCheckId}/decision`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', decisionNote: 'Verified business registration' })
      .expect(201);
    expect(decided.body.data.status).toBe('APPROVED');
    expect(prismaFake.developerProfiles[0].verifiedAt).not.toBeNull();
  });

  it('lists moderation cases and resolves them', async () => {
    const listed = await request(app.getHttpServer())
      .get('/api/v1/admin/moderation')
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.data.length).toBeGreaterThan(0);

    const resolved = await request(app.getHttpServer())
      .post(`/api/v1/admin/moderation/${moderationCaseId}/decision`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({ decision: 'APPROVE', decisionNote: 'No policy violation' })
      .expect(201);
    expect(resolved.body.data.status).toBe('RESOLVED');
  });

  it('lists reports for admins', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/admin/reports')
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('lists and resolves disputes', async () => {
    const listed = await request(app.getHttpServer())
      .get('/api/v1/admin/disputes')
      .set('authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listed.body.data).toHaveLength(1);

    const resolved = await request(app.getHttpServer())
      .post(`/api/v1/admin/disputes/${disputeId}/resolve`)
      .set('authorization', `Bearer ${adminToken}`)
      .send({ resolution: 'Refund issued after review' })
      .expect(201);
    expect(resolved.body.data.status).toBe('RESOLVED');
  });
});
