import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  AiConversationDetail,
  AiConversationSummary,
  SendAiMessageResult,
} from '@mixoraone/contracts';
import { IsString, Length } from 'class-validator';

import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import type { AuthenticatedRequest, AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirementAssistantService } from './requirement-assistant.service';

class SendAiMessageDto {
  @IsString()
  @Length(1, 2000)
  content!: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai/requirements/sessions')
export class AiRequirementsController {
  constructor(
    private readonly assistant: RequirementAssistantService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Start a requirement assistant conversation' })
  create(@CurrentUser() principal: AuthPrincipal): Promise<AiConversationSummary> {
    return this.assistant.createSession(principal.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List own requirement conversations' })
  list(@CurrentUser() principal: AuthPrincipal): Promise<AiConversationSummary[]> {
    return this.assistant.listSessions(principal.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Conversation with messages and recommendations' })
  get(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<AiConversationDetail> {
    return this.assistant.getSession(conversationId, principal.userId);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message and get the assistant reply' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: SendAiMessageDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<SendAiMessageResult> {
    // AI calls are expensive; rate limit per user (and IP as a fallback key).
    await this.rateLimit.consume(
      { name: 'ai:requirement-messages', limit: 30, windowSeconds: 3600 },
      `${principal.userId}:${req.ip ?? 'unknown'}`,
    );
    return this.assistant.sendMessage(conversationId, principal.userId, dto.content);
  }
}
