import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import { AdminAuditController } from './admin-audit.controller';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { GithubOAuthProvider } from './oauth/github.provider';
import { GoogleOAuthProvider } from './oauth/google.provider';
import { OAuthController } from './oauth/oauth.controller';
import { OAUTH_PROVIDERS_TOKEN } from './oauth/oauth-provider.port';
import { OAuthService } from './oauth/oauth.service';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController, OAuthController, AdminAuditController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    OAuthService,
    RateLimitService,
    GoogleOAuthProvider,
    GithubOAuthProvider,
    {
      provide: OAUTH_PROVIDERS_TOKEN,
      useFactory: (google: GoogleOAuthProvider, github: GithubOAuthProvider) => [google, github],
      inject: [GoogleOAuthProvider, GithubOAuthProvider],
    },
    // Secure by default: every route requires auth unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [TokenService, PasswordService],
})
export class AuthModule {}
