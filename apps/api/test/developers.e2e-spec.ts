import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { PrismaFake } from './support/prisma-fake';

describe('Developer profiles (e2e, in-memory persistence)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;
  let devToken: string;

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

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'dev@mixora.one', password: 'a-strong-password', name: 'Dev' })
      .expect(201);
    devToken = response.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('404s before a profile exists', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .expect(404);
  });

  it('creates a profile and upgrades the platform role to DEVELOPER', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({
        displayName: 'Mixora Dev Studio',
        headline: 'We build commerce tools',
        skills: ['typescript', 'nestjs'],
        websiteUrl: 'https://mixora.dev',
      })
      .expect(201);

    expect(response.body.data.slug).toBe('mixora-dev-studio');
    expect(response.body.data.verified).toBe(false);
    expect(response.body.data.verificationStatus).toBeNull();

    const user = prismaFake.users.find((row) => row.email === 'dev@mixora.one')!;
    expect(user.role).toBe('DEVELOPER');
    expect(prismaFake.auditLogs.some((row) => row.action === 'user.role_upgraded')).toBe(true);
  });

  it('rejects a second profile for the same user', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ displayName: 'Another Studio' })
      .expect(409);
  });

  it('serves the public profile without authentication', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/developers/mixora-dev-studio')
      .expect(200);
    expect(response.body.data.displayName).toBe('Mixora Dev Studio');
    expect(response.body.data.skills).toEqual(['typescript', 'nestjs']);
    // Owner-only fields never leak on the public view.
    expect(response.body.data.verificationStatus).toBeUndefined();
    expect(response.body.data.id).toBeUndefined();

    await request(app.getHttpServer()).get('/api/v1/developers/does-not-exist').expect(404);
  });

  it('updates profile fields', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ headline: 'Updated headline', skills: ['typescript'] })
      .expect(200);
    expect(response.body.data.headline).toBe('Updated headline');
    expect(response.body.data.skills).toEqual(['typescript']);
  });

  it('rejects invalid URLs via validation', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .send({ websiteUrl: 'not-a-url' })
      .expect(400);
  });

  it('accepts one pending verification submission at a time', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/developers/me/verification')
      .set('authorization', `Bearer ${devToken}`)
      .send({ legalName: 'Mixora Dev Studio LLC', country: 'India' })
      .expect(202);

    const own = await request(app.getHttpServer())
      .get('/api/v1/developers/me')
      .set('authorization', `Bearer ${devToken}`)
      .expect(200);
    expect(own.body.data.verificationStatus).toBe('PENDING');

    await request(app.getHttpServer())
      .post('/api/v1/developers/me/verification')
      .set('authorization', `Bearer ${devToken}`)
      .send({ legalName: 'Mixora Dev Studio LLC', country: 'India' })
      .expect(409);
  });

  it('blocks verification submissions for already-verified profiles', async () => {
    const profile = prismaFake.developerProfiles[0];
    profile.verifiedAt = new Date();
    prismaFake.developerVerifications.length = 0;

    await request(app.getHttpServer())
      .post('/api/v1/developers/me/verification')
      .set('authorization', `Bearer ${devToken}`)
      .send({ legalName: 'Mixora Dev Studio LLC', country: 'India' })
      .expect(409);

    const publicView = await request(app.getHttpServer())
      .get('/api/v1/developers/mixora-dev-studio')
      .expect(200);
    expect(publicView.body.data.verified).toBe(true);
  });
});
