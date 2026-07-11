import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OAuthProviderSlug, UserRole } from '@mixoraone/contracts';

import { AppConfigService } from '../../../core/config/app-config.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import type { RefreshContext } from '../services/token.service';
import type { AuthResult } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { OAUTH_PROVIDERS_TOKEN, OAuthProfile, OAuthProviderPort } from './oauth-provider.port';

const STATE_TTL_MS = 10 * 60 * 1000;

/** Maps API provider slugs to the Prisma enum values. */
const PROVIDER_ENUM: Record<OAuthProviderSlug, 'GOOGLE' | 'GITHUB'> = {
  google: 'GOOGLE',
  github: 'GITHUB',
};

@Injectable()
export class OAuthService {
  constructor(
    @Inject(OAUTH_PROVIDERS_TOKEN) private readonly providers: OAuthProviderPort[],
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly auditLog: AuditLogService,
    private readonly config: AppConfigService,
  ) {}

  buildAuthorizationUrl(slug: OAuthProviderSlug): { url: string; state: string } {
    const provider = this.getProvider(slug);
    const state = this.createState(slug);
    return {
      url: provider.buildAuthorizationUrl(state, this.redirectUri(slug)),
      state,
    };
  }

  async handleCallback(
    slug: OAuthProviderSlug,
    code: string,
    state: string,
    context: RefreshContext,
  ): Promise<AuthResult> {
    this.assertValidState(slug, state);
    const provider = this.getProvider(slug);
    const profile = await provider.exchangeCode(code, this.redirectUri(slug));
    return this.signInWithProfile(slug, profile, context);
  }

  /**
   * Account resolution per ADR 0002:
   * - Existing provider link: sign in.
   * - Email matches a verified local account with no link: refuse silent
   *   linking (prevents OAuth account takeover); the user must log in first.
   * - Otherwise: create a new user; provider-verified emails carry over.
   */
  private async signInWithProfile(
    slug: OAuthProviderSlug,
    profile: OAuthProfile,
    context: RefreshContext,
  ): Promise<AuthResult> {
    const providerEnum = PROVIDER_ENUM[slug];
    const linked = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: providerEnum,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    let user = linked?.user ?? null;
    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });
      if (existingByEmail) {
        throw new ConflictException(
          'An account with this email already exists. Sign in with your password to link it.',
        );
      }
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
          accounts: {
            create: {
              provider: providerEnum,
              providerAccountId: profile.providerAccountId,
            },
          },
        },
      });
      await this.auditLog.record({
        action: 'auth.oauth_register',
        userId: user.id,
        metadata: { provider: slug },
        ...context,
      });
    } else {
      await this.auditLog.record({
        action: 'auth.oauth_login',
        userId: user.id,
        metadata: { provider: slug },
        ...context,
      });
    }

    const tokens = await this.tokenService.issueSession(
      { id: user.id, email: user.email, role: user.role as UserRole },
      context,
    );
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        emailVerified: user.emailVerifiedAt !== null,
        createdAt: user.createdAt.toISOString(),
      },
      tokens,
    };
  }

  private getProvider(slug: OAuthProviderSlug): OAuthProviderPort {
    const provider = this.providers.find((entry) => entry.slug === slug);
    if (!provider) {
      throw new NotFoundException(`Unknown OAuth provider '${slug}'`);
    }
    return provider;
  }

  private redirectUri(slug: OAuthProviderSlug): string {
    return `${this.config.apiPublicUrl}/api/v1/auth/oauth/${slug}/callback`;
  }

  /** Stateless CSRF state: nonce.expiry.signature (HMAC-SHA256). */
  private createState(slug: OAuthProviderSlug): string {
    const nonce = randomBytes(16).toString('base64url');
    const expiresAt = Date.now() + STATE_TTL_MS;
    const payload = `${slug}.${nonce}.${expiresAt}`;
    return `${nonce}.${expiresAt}.${this.signState(payload)}`;
  }

  private assertValidState(slug: OAuthProviderSlug, state: string): void {
    const [nonce, expiresAtRaw, signature] = state.split('.');
    if (!nonce || !expiresAtRaw || !signature) {
      throw new BadRequestException('Malformed OAuth state');
    }
    const expected = this.signState(`${slug}.${nonce}.${expiresAtRaw}`);
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(signature);
    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new BadRequestException('Invalid OAuth state');
    }
    if (Number(expiresAtRaw) <= Date.now()) {
      throw new BadRequestException('Expired OAuth state');
    }
  }

  private signState(payload: string): string {
    return createHmac('sha256', this.config.oauthStateSecret).update(payload).digest('base64url');
  }
}
