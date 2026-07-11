import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../core/config/app-config.service';
import type { OAuthProfile, OAuthProviderPort } from './oauth-provider.port';

const AUTH_URL = 'https://github.com/login/oauth/authorize';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const EMAILS_URL = 'https://api.github.com/user/emails';

interface GithubUser {
  id: number;
  login: string;
  name: string | null;
}

interface GithubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

@Injectable()
export class GithubOAuthProvider implements OAuthProviderPort {
  readonly slug = 'github' as const;

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return this.config.oauthClient('github') !== null;
  }

  buildAuthorizationUrl(state: string, redirectUri: string): string {
    const client = this.requireClient();
    const params = new URLSearchParams({
      client_id: client.clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthProfile> {
    const client = this.requireClient();
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: client.clientId,
        client_secret: client.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenResponse.ok) {
      throw new ServiceUnavailableException('GitHub token exchange failed');
    }
    const { access_token: accessToken } = (await tokenResponse.json()) as {
      access_token?: string;
    };
    if (!accessToken) {
      throw new ServiceUnavailableException('GitHub token exchange failed');
    }

    const headers = {
      authorization: `Bearer ${accessToken}`,
      accept: 'application/vnd.github+json',
    };
    const [userResponse, emailsResponse] = await Promise.all([
      fetch(USER_URL, { headers }),
      fetch(EMAILS_URL, { headers }),
    ]);
    if (!userResponse.ok || !emailsResponse.ok) {
      throw new ServiceUnavailableException('GitHub profile fetch failed');
    }
    const user = (await userResponse.json()) as GithubUser;
    const emails = (await emailsResponse.json()) as GithubEmail[];

    const primary = emails.find((entry) => entry.primary) ?? emails[0];
    if (!primary) {
      throw new ServiceUnavailableException('GitHub account has no email address');
    }

    return {
      providerAccountId: String(user.id),
      email: primary.email.toLowerCase(),
      emailVerified: primary.verified,
      name: user.name ?? user.login,
    };
  }

  private requireClient() {
    const client = this.config.oauthClient('github');
    if (!client) {
      throw new ServiceUnavailableException('GitHub OAuth is not configured');
    }
    return client;
  }
}
