import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from './env.schema';

export interface JwtKeyConfig {
  algorithm: 'RS256' | 'HS256';
  /** Signing key: private key for RS256, shared secret for HS256. */
  signKey: string;
  /** Verification key: public key for RS256, shared secret for HS256. */
  verifyKey: string;
}

export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * Typed facade over ConfigService so the rest of the codebase never touches
 * raw environment keys.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.config.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.config.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.config.get('DATABASE_URL', { infer: true });
  }

  get redisUrl(): string {
    return this.config.get('REDIS_URL', { infer: true });
  }

  get corsOrigins(): string[] {
    return this.config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  get webAppUrl(): string {
    return this.config.get('WEB_APP_URL', { infer: true });
  }

  get apiPublicUrl(): string {
    return this.config.get('API_PUBLIC_URL', { infer: true });
  }

  get jwt(): JwtKeyConfig {
    const privateKey = this.config.get('JWT_PRIVATE_KEY', { infer: true });
    const publicKey = this.config.get('JWT_PUBLIC_KEY', { infer: true });
    if (privateKey && publicKey) {
      return { algorithm: 'RS256', signKey: privateKey, verifyKey: publicKey };
    }
    const secret = this.config.get('JWT_SECRET', { infer: true });
    return { algorithm: 'HS256', signKey: secret, verifyKey: secret };
  }

  get accessTokenTtlSeconds(): number {
    return this.config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }

  get refreshTokenTtlDays(): number {
    return this.config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
  }

  /** HMAC key for OAuth state; derived from the JWT signing material. */
  get oauthStateSecret(): string {
    return `${this.config.get('JWT_SECRET', { infer: true })}:oauth-state`;
  }

  oauthClient(provider: 'google' | 'github'): OAuthClientConfig | null {
    const clientId =
      provider === 'google'
        ? this.config.get('GOOGLE_CLIENT_ID', { infer: true })
        : this.config.get('GITHUB_CLIENT_ID', { infer: true });
    const clientSecret =
      provider === 'google'
        ? this.config.get('GOOGLE_CLIENT_SECRET', { infer: true })
        : this.config.get('GITHUB_CLIENT_SECRET', { infer: true });
    if (!clientId || !clientSecret) {
      return null;
    }
    return { clientId, clientSecret };
  }

  get aiProvider(): 'openai' | 'gemini' | 'anthropic' | null {
    return this.config.get('AI_PROVIDER', { infer: true }) ?? null;
  }

  aiProviderConfig(provider: 'openai' | 'gemini' | 'anthropic'): {
    apiKey: string;
    model: string;
  } | null {
    const apiKey =
      provider === 'openai'
        ? this.config.get('OPENAI_API_KEY', { infer: true })
        : provider === 'gemini'
          ? this.config.get('GEMINI_API_KEY', { infer: true })
          : this.config.get('ANTHROPIC_API_KEY', { infer: true });
    if (!apiKey) {
      return null;
    }
    const model =
      provider === 'openai'
        ? this.config.get('OPENAI_MODEL', { infer: true })
        : provider === 'gemini'
          ? this.config.get('GEMINI_MODEL', { infer: true })
          : this.config.get('ANTHROPIC_MODEL', { infer: true });
    return { apiKey, model };
  }

  get paymentProvider(): 'mock' | 'stripe' {
    return this.config.get('PAYMENT_PROVIDER', { infer: true });
  }

  get paymentWebhookSecret(): string {
    return this.config.get('PAYMENT_WEBHOOK_SECRET', { infer: true });
  }

  get stripeSecretKey(): string | undefined {
    return this.config.get('STRIPE_SECRET_KEY', { infer: true });
  }

  get stripeWebhookSecret(): string | undefined {
    return this.config.get('STRIPE_WEBHOOK_SECRET', { infer: true });
  }

  get version(): string {
    return process.env.npm_package_version ?? '0.1.0';
  }
}
