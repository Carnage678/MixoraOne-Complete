import * as argon2 from 'argon2';

import type { PrismaClient } from '../../generated/prisma/client';

/** Matches the pre-filled values on the web sign-in page. */
export const DEMO_USER = {
  email: 'demo@mixora.one',
  password: 'demo-password-123',
  name: 'Demo User',
} as const;

/**
 * Idempotent local-dev seed so the sign-in form credentials work out of the box.
 * Never run this in production.
 */
export async function ensureDemoUser(prisma: PrismaClient): Promise<'created' | 'exists'> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_USER.email } });
  if (existing) {
    return 'exists';
  }

  const passwordHash = await argon2.hash(DEMO_USER.password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  await prisma.user.create({
    data: {
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      passwordHash,
      emailVerifiedAt: new Date(),
      role: 'USER',
    },
  });

  return 'created';
}
