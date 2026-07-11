import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthSession, AuthUser } from '@mixoraone/contracts';
import type { Response } from 'express';

import { AppConfigService } from '../../core/config/app-config.service';
import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthenticatedRequest, AuthPrincipal } from './auth.types';
import { REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import type { AuthResult } from './services/auth.service';
import { AuthService } from './services/auth.service';
import type { RefreshContext } from './services/token.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rateLimit: RateLimitService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Create an account with email and password' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    await this.rateLimit.consume(
      { name: 'auth:register', limit: 5, windowSeconds: 3600 },
      req.ip ?? 'unknown',
    );
    const result = await this.authService.register(dto, this.context(req));
    return this.toSession(result, res);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    await this.rateLimit.consume(
      { name: 'auth:login', limit: 10, windowSeconds: 900 },
      `${req.ip ?? 'unknown'}:${dto.email.toLowerCase()}`,
    );
    const result = await this.authService.login(dto, this.context(req));
    return this.toSession(result, res);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh cookie and get a new access token' })
  async refresh(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSession> {
    const refreshToken = this.readRefreshCookie(req);
    const result = await this.authService.refresh(refreshToken, this.context(req));
    return this.toSession(result, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current session' })
  async logout(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const refreshToken = cookies?.[REFRESH_COOKIE];
    if (refreshToken) {
      await this.authService.logout(refreshToken, this.context(req));
    }
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an email address with a verification token' })
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<AuthUser> {
    return this.authService.verifyEmail(dto.token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@CurrentUser() principal: AuthPrincipal): Promise<AuthUser> {
    return this.authService.getById(principal.userId);
  }

  private context(req: AuthenticatedRequest): RefreshContext {
    return { ip: req.ip, userAgent: req.header('user-agent') ?? undefined };
  }

  private readRefreshCookie(req: AuthenticatedRequest): string {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    const token = cookies?.[REFRESH_COOKIE];
    if (!token) {
      throw new UnauthorizedException('Missing refresh token');
    }
    return token;
  }

  private toSession(result: AuthResult, res: Response): AuthSession {
    res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      expires: result.tokens.refreshExpiresAt,
    });
    return {
      user: result.user,
      tokens: {
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      },
    };
  }
}
