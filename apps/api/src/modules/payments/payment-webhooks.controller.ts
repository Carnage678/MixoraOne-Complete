import { Controller, Headers, Param, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { Public } from '../auth/decorators/public.decorator';
import { WebhookService } from './webhook.service';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

@ApiTags('payments')
@Controller('payments/webhooks')
export class PaymentWebhooksController {
  constructor(private readonly webhooks: WebhookService) {}

  @Public()
  @Post(':provider')
  @ApiOperation({ summary: 'Payment provider webhook endpoint (signature verified)' })
  async receive(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest,
    @Headers('x-mixora-signature') mixoraSignature: string | undefined,
    @Headers('stripe-signature') stripeSignature: string | undefined,
  ) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    const signature = provider === 'stripe' ? stripeSignature : mixoraSignature;
    return this.webhooks.handle(provider, rawBody, signature);
  }
}
