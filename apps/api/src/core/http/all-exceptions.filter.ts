import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { ApiErrorResponse } from '@mixoraone/contracts';
import type { Response } from 'express';

import type { RequestWithId } from './request-id.middleware';

/** Converts every error into the shared API error envelope. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const bodyMessage = (body as { message?: string | string[] }).message;
        if (Array.isArray(bodyMessage)) {
          message = 'Validation failed';
          details = bodyMessage;
        } else {
          message = bodyMessage ?? exception.message;
        }
      }
    } else {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(`Unhandled exception: ${error.message}`, error.stack);
    }

    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code: HttpStatus[status] ?? 'ERROR',
        message,
        ...(details === undefined ? {} : { details }),
      },
      requestId: request.requestId ?? 'unknown',
    };

    response.status(status).json(payload);
  }
}
