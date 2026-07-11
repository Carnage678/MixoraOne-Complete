import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AppConfigService } from '../../../core/config/app-config.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { TokenService } from './token.service';

/**
 * Unit tests for rotation policy details that are awkward to hit over HTTP,
 * e.g. expired-token handling. Storage is a tiny in-memory stub.
 */
describe('TokenService', () => {
  const configStub = {
    jwt: { algorithm: 'HS256', signKey: 'unit-test-secret-0123456789abcdef', verifyKey: 'x' },
    accessTokenTtlSeconds: 900,
    refreshTokenTtlDays: 30,
  } as unknown as AppConfigService;

  function build() {
    const rows: Array<{
      id: string;
      userId: string;
      tokenHash: string;
      familyId: string;
      expiresAt: Date;
      revokedAt: Date | null;
      user: { id: string; email: string; role: string };
    }> = [];
    const prismaStub = {
      refreshToken: {
        create: async ({ data }: { data: (typeof rows)[number] }) => {
          const row = {
            ...data,
            id: `row-${rows.length}`,
            revokedAt: null,
            user: { id: data.userId, email: 'unit@mixora.one', role: 'USER' },
          };
          rows.push(row);
          return row;
        },
        findUnique: async ({ where }: { where: { tokenHash: string } }) =>
          rows.find((row) => row.tokenHash === where.tokenHash) ?? null,
        update: async ({ where, data }: { where: { id: string }; data: { revokedAt: Date } }) => {
          const row = rows.find((entry) => entry.id === where.id)!;
          Object.assign(row, data);
          return row;
        },
        updateMany: async ({
          where,
          data,
        }: {
          where: { familyId: string };
          data: { revokedAt: Date };
        }) => {
          rows
            .filter((row) => row.familyId === where.familyId && row.revokedAt === null)
            .forEach((row) => Object.assign(row, data));
          return { count: 1 };
        },
      },
    } as unknown as PrismaService;
    return { service: new TokenService(prismaStub, new JwtService({}), configStub), rows };
  }

  const subject = { id: 'user-1', email: 'unit@mixora.one', role: 'USER' as const };

  it('issues a session with an access token and stores only the hash', async () => {
    const { service, rows } = build();
    const tokens = await service.issueSession(subject, {});
    expect(tokens.accessToken.split('.')).toHaveLength(3);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(tokens.refreshToken);
  });

  it('rejects expired refresh tokens', async () => {
    const { service, rows } = build();
    const tokens = await service.issueSession(subject, {});
    rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(service.rotate(tokens.refreshToken, {})).rejects.toThrow(UnauthorizedException);
  });

  it('rejects unknown refresh tokens', async () => {
    const { service } = build();
    await expect(service.rotate('never-issued', {})).rejects.toThrow(UnauthorizedException);
  });

  it('revokes the family when a rotated token is replayed', async () => {
    const { service, rows } = build();
    const first = await service.issueSession(subject, {});
    await service.rotate(first.refreshToken, {});
    await expect(service.rotate(first.refreshToken, {})).rejects.toThrow(
      'Refresh token reuse detected; session revoked',
    );
    expect(rows.every((row) => row.revokedAt !== null)).toBe(true);
  });
});
