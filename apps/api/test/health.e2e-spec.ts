import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RedisService } from '../src/infrastructure/redis/redis.service';

/**
 * API smoke tests. Infrastructure clients are stubbed so the suite runs
 * without PostgreSQL/Redis (CI-friendly); dependency-status handling is
 * still exercised through the health report shape.
 */
describe('API smoke (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ isHealthy: async () => true })
      .overrideProvider(RedisService)
      .useValue({ isHealthy: async () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns envelope with component statuses', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.requestId).toBeDefined();
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.components).toEqual({ database: 'up', redis: 'up' });
  });

  it('GET /api/v1/health/ready returns 200 when dependencies are up', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  it('GET /api/v1/health/ready returns 503 when a dependency is down', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ isHealthy: async () => false })
      .overrideProvider(RedisService)
      .useValue({ isHealthy: async () => true })
      .compile();

    const degradedApp = moduleRef.createNestApplication();
    degradedApp.setGlobalPrefix('api/v1');
    await degradedApp.init();

    const response = await request(degradedApp.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503);
    expect(response.body.success).toBe(false);
    await degradedApp.close();
  });

  it('GET /api/v1/meta returns service metadata', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/meta').expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('MixoraOne API');
    expect(typeof response.body.data.version).toBe('string');
  });

  it('unknown routes return the shared error envelope', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/nope').expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
    expect(response.body.requestId).toBeDefined();
  });

  it('echoes a caller-provided x-request-id', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('x-request-id', 'test-correlation-id')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('test-correlation-id');
    expect(response.body.requestId).toBe('test-correlation-id');
  });
});
