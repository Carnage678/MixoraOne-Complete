/**
 * Manual seed entrypoint: `pnpm --filter @mixoraone/api run db:seed`
 * Creates the same demo account the sign-in form pre-fills.
 */
import { config as loadEnv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { DEMO_USER, ensureDemoUser } from '../apps/api/src/infrastructure/database/demo-user.seed';

loadEnv({ path: ['.env', 'apps/api/.env'] });

async function main(): Promise<void> {
  const url =
    process.env.DATABASE_URL ??
    'postgresql://mixora:mixora@localhost:5432/mixoraone?schema=public';
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  try {
    const result = await ensureDemoUser(prisma);
    console.log(
      result === 'created'
        ? `Created demo user ${DEMO_USER.email} / ${DEMO_USER.password}`
        : `Demo user already exists: ${DEMO_USER.email} / ${DEMO_USER.password}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
