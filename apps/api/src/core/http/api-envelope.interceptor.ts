import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { ApiSuccessResponse } from '@mixoraone/contracts';
import { Observable, map } from 'rxjs';

import type { RequestWithId } from './request-id.middleware';

/** Wraps every successful controller response in the shared API envelope. */
@Injectable()
export class ApiEnvelopeInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        requestId: request.requestId ?? 'unknown',
      })),
    );
  }
}
