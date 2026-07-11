import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { AppConfigService } from '../../core/config/app-config.service';

const RETRY_CAP_MS = 30_000;
const LOG_THROTTLE_MS = 30_000;

/**
 * Shared Redis connection. Future modules (sessions, rate limits, queues,
 * cache) layer on top of this client rather than opening their own.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private lastErrorLogAt = 0;
  readonly client: Redis;

  constructor(config: AppConfigService) {
    this.client = new Redis(config.redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 1_000, RETRY_CAP_MS),
    });
    this.client.on('error', (error) => {
      // ioredis emits on every failed reconnect attempt; throttle the noise.
      const now = Date.now();
      if (now - this.lastErrorLogAt >= LOG_THROTTLE_MS) {
        this.lastErrorLogAt = now;
        this.logger.warn(`Redis unavailable: ${error.message || 'connection error'}`);
      }
    });
    this.client.connect().catch(() => {
      this.logger.error('Could not connect to Redis at startup; health will report it as down');
    });
  }

  async onModuleDestroy(): Promise<void> {
    // quit() hangs when the connection never came up; disconnect is safe here.
    this.client.disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
