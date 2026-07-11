import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AiDeveloperConversationDetail,
  AiDeveloperConversationSummary,
  SendDeveloperAiMessageResult,
} from '@mixoraone/contracts';
import { IsString, IsUUID, Length } from 'class-validator';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthenticatedRequest, AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DeveloperAssistantService } from './developer-assistant.service';

class CreateDeveloperSessionDto {
  @IsUUID()
  productId!: string;
}

class SendDeveloperMessageDto {
  @IsString()
  @Length(1, 2000)
  content!: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai/developer-assistant/sessions')
export class DeveloperAssistantController {
  constructor(
    private readonly assistant: DeveloperAssistantService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Start a developer assistant conversation for a product' })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreateDeveloperSessionDto,
  ): Promise<AiDeveloperConversationSummary> {
    return this.assistant.createSession(principal.userId, dto.productId);
  }

  @Get()
  @ApiOperation({ summary: 'List developer assistant conversations' })
  list(
    @CurrentUser() principal: AuthPrincipal,
    @Query('productId') productId?: string,
  ): Promise<AiDeveloperConversationSummary[]> {
    return this.assistant.listSessions(principal.userId, productId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Developer assistant conversation with messages and suggestions' })
  get(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<AiDeveloperConversationDetail> {
    return this.assistant.getSession(conversationId, principal.userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message and get listing improvement suggestions' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: SendDeveloperMessageDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SendDeveloperAiMessageResult> {
    await this.rateLimit.consume(
      { name: 'ai:developer-messages', limit: 40, windowSeconds: 3600 },
      `${principal.userId}:${req.ip ?? 'unknown'}`,
    );
    return this.assistant.sendMessage(conversationId, principal.userId, dto.content);
  }
}
