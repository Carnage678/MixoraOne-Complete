import { createHash } from 'node:crypto';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';
import { PrismaFake } from './support/prisma-fake';

const CREDENTIALS = {
  email: 'founder@mixora.one',
  password: 'super-secure-password',
  name: 'Founder',
};

function extractRefreshCookie(response: request.Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = cookies?.find((entry) => entry.startsWith('mx_refresh='));
  expect(cookie).toBeDefined();
  return cookie!.split(';')[0];
}

describe('Auth flows (e2e, in-memory persistence)', () => {
  let app: INestApplication;
  let prismaFake: PrismaFake;

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
        client: {
          incr: async () => {
            throw new Error('redis offline in tests');
          },
          expire: async () => 1,
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects protected routes without a token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('registers a user, sets the refresh cookie, and returns a session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(CREDENTIALS)
      .expect(201);

    expect(response.body.data.user.email).toBe(CREDENTIALS.email);
    expect(response.body.data.user.emailVerified).toBe(false);
    expect(response.body.data.tokens.accessToken).toBeDefined();
    const cookie = extractRefreshCookie(response);
    expect(cookie.length).toBeGreaterThan('mx_refresh='.length);
    // The refresh token itself must never appear in the response body.
    expect(JSON.stringify(response.body)).not.toContain(cookie.split('=')[1]);
  });

  it('rejects duplicate registration', async () => {
    await request(app.getHttpServer()).post('/api/v1/auth/register').send(CREDENTIALS).expect(409);
  });

  it('rejects weak passwords via validation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'weak@mixora.one', password: 'short', name: 'Weak' })
      .expect(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects wrong credentials and audits the failure', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: 'incorrect-password' })
      .expect(401);
    expect(prismaFake.auditLogs.some((row) => row.action === 'auth.login_failed')).toBe(true);
  });

  it('logs in and authorizes /auth/me with the access token', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: CREDENTIALS.password })
      .expect(200);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${login.body.data.tokens.accessToken}`)
      .expect(200);
    expect(me.body.data.email).toBe(CREDENTIALS.email);
    expect(me.body.data.role).toBe('USER');
  });

  it('rotates the refresh token and detects reuse of the old one', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: CREDENTIALS.password })
      .expect(200);
    const firstCookie = extractRefreshCookie(login);

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('cookie', firstCookie)
      .expect(200);
    const secondCookie = extractRefreshCookie(refreshed);
    expect(secondCookie).not.toBe(firstCookie);

    // Replaying the rotated token is treated as theft...
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('cookie', firstCookie)
      .expect(401);

    // ...and revokes the whole family, including the newest token.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('cookie', secondCookie)
      .expect(401);
  });

  it('logs out and invalidates the session', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: CREDENTIALS.password })
      .expect(200);
    const cookie = extractRefreshCookie(login);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('cookie', cookie)
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('cookie', cookie)
      .expect(401);
  });

  it('verifies email via the emitted token', async () => {
    // The plaintext token only exists in the log; reconstruct a valid one by
    // inserting a known token hash directly, as an email would deliver it.
    const user = prismaFake.users.find((row) => row.email === CREDENTIALS.email)!;
    const plain = 'test-verification-token-0123456789';
    await prismaFake.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash('sha256').update(plain).digest('hex'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: plain })
      .expect(200);
    expect(response.body.data.emailVerified).toBe(true);
  });

  it('enforces RBAC on the admin audit endpoint', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: CREDENTIALS.password })
      .expect(200);
    const userToken = login.body.data.tokens.accessToken;

    await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('authorization', `Bearer ${userToken}`)
      .expect(403);

    // Promote to admin and sign in again for a token carrying the new role.
    const user = prismaFake.users.find((row) => row.email === CREDENTIALS.email)!;
    user.role = 'ADMIN';
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: CREDENTIALS.email, password: CREDENTIALS.password })
      .expect(200);

    const audit = await request(app.getHttpServer())
      .get('/api/v1/admin/audit-logs')
      .set('authorization', `Bearer ${adminLogin.body.data.tokens.accessToken}`)
      .expect(200);
    expect(Array.isArray(audit.body.data)).toBe(true);
    expect(audit.body.data.length).toBeGreaterThan(0);
    expect(audit.body.data.some((row: { action: string }) => row.action === 'auth.login')).toBe(
      true,
    );
  });

  it('returns 503 for unconfigured OAuth providers and 400 for unknown ones', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/oauth/google').expect(503);
    await request(app.getHttpServer()).get('/api/v1/auth/oauth/myspace').expect(400);
  });
});
