import type { OAuthProviderSlug } from '@mixoraone/contracts';

/** Normalized identity returned by every OAuth provider adapter. */
export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/**
 * Port implemented by each OAuth provider adapter so the auth flow never
 * depends on provider-specific APIs.
 */
export interface OAuthProviderPort {
  readonly slug: OAuthProviderSlug;
  /** Whether client credentials are configured for this environment. */
  isConfigured(): boolean;
  buildAuthorizationUrl(state: string, redirectUri: string): string;
  exchangeCode(code: string, redirectUri: string): Promise<OAuthProfile>;
}

export const OAUTH_PROVIDERS_TOKEN = Symbol('OAUTH_PROVIDERS');
