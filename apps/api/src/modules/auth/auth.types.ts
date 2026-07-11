import type { UserRole } from '@mixoraone/contracts';
import type { Request } from 'express';

/** Claims carried by MixoraOne access tokens. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  type: 'access';
}

/** Principal attached to the request after JWT verification. */
export interface AuthPrincipal {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPrincipal;
  requestId?: string;
}

/** Name of the httpOnly cookie carrying the refresh token. */
export const REFRESH_COOKIE = 'mx_refresh';

/** Cookie is scoped to the auth endpoints only. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
