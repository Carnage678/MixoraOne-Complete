import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

import { AppConfigService } from '../../../core/config/app-config.service';
import type { AccessTokenPayload, AuthenticatedRequest } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard: every route requires a valid bearer token
 * unless it is marked with @Public().
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (isPublic) {
      // Best effort: attach the principal when a valid token is sent so
      // public endpoints (e.g. search) can attribute activity; never block.
      await this.tryAttachPrincipal(request);
      return true;
    }

    const attached = await this.tryAttachPrincipal(request);
    if (attached === 'missing') {
      throw new UnauthorizedException('Missing access token');
    }
    if (attached !== 'ok') {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return true;
  }

  private async tryAttachPrincipal(
    request: AuthenticatedRequest,
  ): Promise<'ok' | 'missing' | 'invalid'> {
    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return 'missing';
    }

    const token = authorization.slice('Bearer '.length);
    let payload: AccessTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.jwt.verifyKey,
        algorithms: [this.config.jwt.algorithm],
      });
    } catch {
      return 'invalid';
    }
    if (payload.type !== 'access') {
      return 'invalid';
    }

    request.user = { userId: payload.sub, email: payload.email, role: payload.role };
    return 'ok';
  }
}
