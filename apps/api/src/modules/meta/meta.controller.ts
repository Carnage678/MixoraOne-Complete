import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { ApiMeta } from '@mixoraone/contracts';

import { AppConfigService } from '../../core/config/app-config.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('meta')
@Controller('meta')
export class MetaController {
  constructor(private readonly config: AppConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'API name, version, and environment' })
  @ApiOkResponse({ description: 'Basic service metadata' })
  meta(): ApiMeta {
    return {
      name: 'MixoraOne API',
      version: this.config.version,
      environment: this.config.nodeEnv,
      uptimeSeconds: Math.round(process.uptime()),
    };
  }
}
