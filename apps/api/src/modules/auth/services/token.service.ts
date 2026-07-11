import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthTokens, UserRole } from '@mixoraone/contracts';

import { AppConfigService } from '../../../core/config/app-config.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import type { AccessTokenPayload } from '../auth.types';

export interface IssuedTokens extends AuthTokens {
  /** Plaintext refresh token; only ever leaves the API inside the cookie. */
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface RefreshContext {
  userAgent?: string;
  ip?: string;
}

interface TokenSubject {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Issues short-lived access JWTs and opaque rotating refresh tokens.
 * Refresh tokens are stored hashed; rotation chains share a familyId and any
 * reuse of a rotated token revokes the entire family (ADR 0002).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async issueSession(user: TokenSubject, context: RefreshContext): Promise<IssuedTokens> {
    return this.issue(user, randomUUID(), context);
  }

  /**
   * Rotates a refresh token: validates it, revokes it, and issues a fresh
   * pair in the same family. Reuse of an already-rotated token is treated as
   * theft and revokes every active token in the family.
   */
  async rotate(
    plainRefreshToken: string,
    context: RefreshContext,
  ): Promise<{ tokens: IssuedTokens; userId: string; reuseDetected: false }> {
    const tokenHash = this.hashToken(plainRefreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.familyId);
      throw new UnauthorizedException('Refresh token reuse detected; session revoked');
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issue(
      { id: stored.user.id, email: stored.user.email, role: stored.user.role as UserRole },
      stored.familyId,
      context,
    );
    return { tokens, userId: stored.user.id, reuseDetected: false };
  }

  /** Revokes the presented token's whole family (logout). */
  async revokeByToken(plainRefreshToken: string): Promise<string | null> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(plainRefreshToken) },
    });
    if (!stored) {
      return null;
    }
    await this.revokeFamily(stored.familyId);
    return stored.userId;
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async issue(
    user: TokenSubject,
    familyId: string,
    context: RefreshContext,
  ): Promise<IssuedTokens> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      type: 'access',
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.jwt.signKey,
      algorithm: this.config.jwt.algorithm,
      expiresIn: this.config.accessTokenTtlSeconds,
    });

    const refreshToken = randomBytes(32).toString('base64url');
    const refreshExpiresAt = new Date(
      Date.now() + this.config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        familyId,
        expiresAt: refreshExpiresAt,
        userAgent: context.userAgent ?? null,
        ip: context.ip ?? null,
      },
    });

    return {
      accessToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      refreshToken,
      refreshExpiresAt,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
