import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma CLI does not auto-load .env when a config file is present.
// App-local .env wins over the repo-root one, matching the API ConfigModule.
loadEnv({ path: ['.env', '../../.env'] });

const DEFAULT_DATABASE_URL = 'postgresql://mixora:mixora@localhost:5432/mixoraone?schema=public';

export default defineConfig({
  schema: '../../prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  },
});
