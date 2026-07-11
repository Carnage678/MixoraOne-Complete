import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { AppConfigService } from '../../core/config/app-config.service';
import { PrismaClient } from '../../generated/prisma/client';

/**
 * Single PrismaClient instance for the whole API. Repositories in feature
 * modules depend on this service instead of instantiating their own clients.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: AppConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  }

  async onModuleInit(): Promise<void> {
    // $connect() is lazy with driver adapters, so probe with a real query.
    // Boot either way: health checks report the database as down instead of
    // crash-looping the API while infrastructure starts up.
    if (await this.isHealthy()) {
      this.logger.log('Connected to PostgreSQL');
    } else {
      this.logger.warn('PostgreSQL unreachable at startup; health will report it as down');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
