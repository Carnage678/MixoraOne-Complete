import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CheckoutSessionResult } from '@mixoraone/contracts';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthenticatedRequest, AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CheckoutService } from './checkout.service';

class CreateCheckoutSessionDto {
  @IsUUID()
  pricingPlanId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  successPath?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  cancelPath?: string;
}

@ApiTags('checkout')
@ApiBearerAuth()
@Controller('checkout/sessions')
export class CheckoutController {
  constructor(
    private readonly checkout: CheckoutService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a checkout session for a published pricing plan' })
  async create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreateCheckoutSessionDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Req() req: AuthenticatedRequest,
  ): Promise<CheckoutSessionResult> {
    await this.rateLimit.consume(
      { name: 'checkout:sessions', limit: 20, windowSeconds: 3600 },
      `${principal.userId}:${req.ip ?? 'unknown'}`,
    );
    return this.checkout.createSession(
      principal.userId,
      principal.email,
      dto.pricingPlanId,
      idempotencyKey,
      dto.successPath,
      dto.cancelPath,
    );
  }
}
