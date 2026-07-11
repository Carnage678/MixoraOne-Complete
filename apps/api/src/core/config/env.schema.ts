import { z } from 'zod';

/**
 * Environment contract for the API. Defaults target local development and the
 * docker-compose services; production deployments must override them.
 */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgresql://mixora:mixora@localhost:5432/mixoraone?schema=public'),
    REDIS_URL: z.string().min(1).default('redis://localhost:6379'),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
    WEB_APP_URL: z.string().url().default('http://localhost:3000'),
    API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),

    // Auth (Epic 2). HS256 via JWT_SECRET by default; supply the key pair to
    // switch to RS256 without code changes (ADR 0002).
    JWT_SECRET: z.string().min(32).default('dev-only-secret-change-me-0123456789abcdef'),
    JWT_PRIVATE_KEY: z.string().optional(),
    JWT_PUBLIC_KEY: z.string().optional(),
    JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),

    // OAuth providers are optional; endpoints report 503 when unconfigured.
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),

    // AI (Epic 7). Provider is swappable; AI endpoints 503 when unconfigured.
    AI_PROVIDER: z.enum(['openai', 'gemini', 'anthropic']).optional(),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_MODEL: z.string().default('claude-3-5-haiku-latest'),

    // Payments (Epic 9). Mock provider works out of the box in development.
    PAYMENT_PROVIDER: z.enum(['mock', 'stripe']).default('mock'),
    PAYMENT_WEBHOOK_SECRET: z.string().min(16).default('dev-webhook-secret-change-me'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.JWT_SECRET.startsWith('dev-only-secret')) {
        ctx.addIssue({
          code: 'custom',
          path: ['JWT_SECRET'],
          message: 'JWT_SECRET must be overridden in production',
        });
      }
    }
    if ((env.JWT_PRIVATE_KEY === undefined) !== (env.JWT_PUBLIC_KEY === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_PRIVATE_KEY'],
        message: 'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be provided together',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const normalized = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
  const result = envSchema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${issues}`);
  }
  return result.data;
}
