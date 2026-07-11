import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import type { AuthenticatedRequest } from '../auth.types';

/** Injects the authenticated principal attached by JwtAuthGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
