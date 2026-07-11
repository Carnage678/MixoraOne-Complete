export const USER_ROLES = ['USER', 'DEVELOPER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const OAUTH_PROVIDERS = ['google', 'github'] as const;
export type OAuthProviderSlug = (typeof OAUTH_PROVIDERS)[number];

/** Public shape of the authenticated user. Never includes credentials. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  createdAt: string;
}

/**
 * Access token payload returned to clients. The refresh token travels only in
 * an httpOnly cookie and never appears in a response body.
 */
export interface AuthTokens {
  accessToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
}

export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
