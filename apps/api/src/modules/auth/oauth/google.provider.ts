import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../core/config/app-config.service';
import type { OAuthProfile, OAuthProviderPort } from './oauth-provider.port';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

interface GoogleUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

@Injectable()
export class GoogleOAuthProvider implements OAuthProviderPort {
  readonly slug = 'google' as const;

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return this.config.oauthClient('google') !== null;
  }

  buildAuthorizationUrl(state: string, redirectUri: string): string {
    const client = this.requireClient();
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthProfile> {
    const client = this.requireClient();
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResponse.ok) {
      throw new ServiceUnavailableException('Google token exchange failed');
    }
    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token: string;
    };

    const userResponse = await fetch(USERINFO_URL, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) {
      throw new ServiceUnavailableException('Google profile fetch failed');
    }
    const profile = (await userResponse.json()) as GoogleUserInfo;

    return {
      providerAccountId: profile.sub,
      email: profile.email.toLowerCase(),
      emailVerified: profile.email_verified,
      name: profile.name ?? profile.email.split('@')[0],
    };
  }

  private requireClient() {
    const client = this.config.oauthClient('google');
    if (!client) {
      throw new ServiceUnavailableException('Google OAuth is not configured');
    }
    return client;
  }
}
