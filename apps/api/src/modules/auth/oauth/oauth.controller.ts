import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  Param,
  ParseEnumPipe,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OAuthProviderSlug } from '@mixoraone/contracts';
import { OAUTH_PROVIDERS } from '@mixoraone/contracts';
import type { Response } from 'express';

import { AppConfigService } from '../../../core/config/app-config.service';
import { RateLimitService } from '../../../core/rate-limit/rate-limit.service';
import type { AuthenticatedRequest } from '../auth.types';
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from '../auth.types';
import { Public } from '../decorators/public.decorator';
import { OAuthService } from './oauth.service';

const providerPipe = new ParseEnumPipe(OAUTH_PROVIDERS, {
  exceptionFactory: () => new BadRequestException('Unsupported OAuth provider'),
});

@ApiTags('auth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(
    private readonly oauthService: OAuthService,
    private readonly rateLimit: RateLimitService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Get(':provider')
  @ApiOperation({ summary: 'Redirect to the OAuth provider consent screen' })
  async start(
    @Param('provider', providerPipe) provider: OAuthProviderSlug,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    await this.rateLimit.consume(
      { name: 'auth:oauth', limit: 20, windowSeconds: 900 },
      req.ip ?? 'unknown',
    );
    const { url } = this.oauthService.buildAuthorizationUrl(provider);
    res.redirect(url);
  }

  @Public()
  @Get(':provider/callback')
  @ApiExcludeEndpoint()
  async callback(
    @Param('provider', providerPipe) provider: OAuthProviderSlug,
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    // Browser-facing flow: failures redirect back to the web app with an
    // error code instead of returning the JSON envelope.
    try {
      if (!code || !state) {
        throw new BadRequestException('Missing code or state');
      }
      const result = await this.oauthService.handleCallback(provider, code, state, {
        ip: req.ip,
        userAgent: req.header('user-agent') ?? undefined,
      });
      res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, {
        httpOnly: true,
        secure: this.config.isProduction,
        sameSite: 'lax',
        path: REFRESH_COOKIE_PATH,
        expires: result.tokens.refreshExpiresAt,
      });
      res.redirect(`${this.config.webAppUrl}/auth/callback`);
    } catch (error) {
      const reason =
        error instanceof HttpException && error.getStatus() === 409
          ? 'account_exists'
          : 'oauth_failed';
      res.redirect(`${this.config.webAppUrl}/sign-in?error=${reason}`);
    }
  }
}
