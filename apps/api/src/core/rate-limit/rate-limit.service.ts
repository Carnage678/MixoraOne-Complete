import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

import { RedisService } from '../../infrastructure/redis/redis.service';

export interface RateLimitRule {
  /** Logical bucket, e.g. 'auth:login'. */
  name: string;
  limit: number;
  windowSeconds: number;
}

/**
 * Fixed-window rate limiter on Redis. Fails open when Redis is unavailable so
 * a cache outage cannot take authentication down with it; the gap is logged.
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  async consume(rule: RateLimitRule, subject: string): Promise<void> {
    const key = `ratelimit:${rule.name}:${subject}`;
    let count: number;
    try {
      count = await this.redis.client.incr(key);
      if (count === 1) {
        await this.redis.client.expire(key, rule.windowSeconds);
      }
    } catch {
      this.logger.warn(`Rate limit '${rule.name}' skipped: Redis unavailable`);
      return;
    }

    if (count > rule.limit) {
      throw new HttpException(
        `Too many requests. Try again in ${rule.windowSeconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
