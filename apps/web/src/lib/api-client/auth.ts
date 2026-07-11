import type { AuthSession, AuthUser, LoginInput, RegisterInput } from '@mixoraone/contracts';

import { apiRequest } from './http';

export function register(input: RegisterInput): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/register', { method: 'POST', body: input });
}

export function login(input: LoginInput): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/login', { method: 'POST', body: input });
}

/** Exchanges the httpOnly refresh cookie for a fresh access token. */
export function refreshSession(): Promise<AuthSession> {
  return apiRequest<AuthSession>('/auth/refresh', { method: 'POST' });
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' });
}

export function fetchMe(accessToken: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', { accessToken });
}

export function verifyEmail(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/verify-email', { method: 'POST', body: { token } });
}

export function oauthStartUrl(provider: 'google' | 'github'): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
  return `${base}/api/v1/auth/oauth/${provider}`;
}
