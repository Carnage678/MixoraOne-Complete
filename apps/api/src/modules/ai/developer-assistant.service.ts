import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type {
  AiChatMessage,
  AiDeveloperConversationDetail,
  AiDeveloperConversationSummary,
  SendDeveloperAiMessageResult,
} from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { ListingAnalysisService } from './listing-analysis.service';
import type { LlmMessage, LlmProviderPort } from './llm/llm-provider.port';
import { LLM_PROVIDER } from './llm/llm-provider.port';

const HISTORY_LIMIT = 12;

@Injectable()
export class DeveloperAssistantService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProviderPort,
    private readonly listingAnalysis: ListingAnalysisService,
    private readonly auditLog: AuditLogService,
  ) {}

  async createSession(
    userId: string,
    productId: string,
  ): Promise<AiDeveloperConversationSummary> {
    this.assertProviderReady();
    await this.listingAnalysis.loadListingContext(productId, userId);
    const conversation = await this.prisma.aiConversation.create({
      data: { userId, kind: 'DEVELOPER_ASSISTANT', productId },
    });
    return this.toSummary(conversation);
  }

  async listSessions(userId: string, productId?: string): Promise<AiDeveloperConversationSummary[]> {
    const conversations = await this.prisma.aiConversation.findMany({
      where: {
        userId,
        kind: 'DEVELOPER_ASSISTANT',
        ...(productId ? { productId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return conversations.map((conversation) => this.toSummary(conversation));
  }

  async getSession(conversationId: string, userId: string): Promise<AiDeveloperConversationDetail> {
    const conversation = await this.requireOwnedConversation(conversationId, userId);
    const [messages, suggestions] = await Promise.all([
      this.prisma.aiMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.productContentSuggestion.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      ...this.toSummary(conversation),
      messages: messages.map((message) => this.toChatMessage(message)),
      suggestions: suggestions.map((row) => ({
        id: row.id,
        field: row.field as AiDeveloperConversationDetail['suggestions'][number]['field'],
        currentValue: row.currentValue,
        suggestedValue: row.suggestedValue,
        reason: row.reason,
        status: row.status as AiDeveloperConversationDetail['suggestions'][number]['status'],
        createdAt: row.createdAt.toISOString(),
      })),
    };
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    content: string,
  ): Promise<SendDeveloperAiMessageResult> {
    this.assertProviderReady();
    const conversation = await this.requireOwnedConversation(conversationId, userId);
    if (!conversation.productId) {
      throw new NotFoundException('Conversation is not linked to a product');
    }

    await this.prisma.aiMessage.create({
      data: { conversationId, role: 'USER', content },
    });
    if (!conversation.title) {
      await this.prisma.aiConversation.update({
        where: { id: conversationId },
        data: { title: content.slice(0, 80) },
      });
    }

    const context = await this.listingAnalysis.loadListingContext(conversation.productId, userId);
    const historyRows = await this.prisma.aiMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
    const history: LlmMessage[] = historyRows.slice(-HISTORY_LIMIT).map((message) => ({
      role: message.role === 'USER' ? ('user' as const) : ('assistant' as const),
      content: message.content,
    }));

    const completion = await this.llm.complete(
      this.listingAnalysis.buildPromptMessages(context, history),
      { maxOutputTokens: 1200, temperature: 0.35 },
    );
    const parsed = this.listingAnalysis.parseModelReply(completion.content);

    const assistantMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT',
        content: parsed.reply,
        provider: completion.provider,
        model: completion.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
      },
    });

    const suggestions = await this.listingAnalysis.persistSuggestions(
      conversation.productId,
      conversationId,
      context,
      parsed.suggestions,
    );

    await this.auditLog.record({
      action: 'ai.developer_message',
      userId,
      metadata: {
        conversationId,
        productId: conversation.productId,
        provider: completion.provider,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        suggestionCount: suggestions.length,
      },
    });

    return { message: this.toChatMessage(assistantMessage), suggestions };
  }

  private assertProviderReady(): void {
    if (!this.llm.isConfigured()) {
      throw new ServiceUnavailableException(
        'AI assistant is not configured. Set AI_PROVIDER and the matching API key.',
      );
    }
  }

  private async requireOwnedConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation || conversation.kind !== 'DEVELOPER_ASSISTANT') {
      throw new NotFoundException('Conversation not found');
    }
    if (conversation.userId !== userId) {
      throw new ForbiddenException('This conversation belongs to another user');
    }
    if (conversation.productId) {
      await this.listingAnalysis.loadListingContext(conversation.productId, userId);
    }
    return conversation;
  }

  private toSummary(conversation: {
    id: string;
    productId: string | null;
    title: string | null;
    createdAt: Date;
  }): AiDeveloperConversationSummary {
    if (!conversation.productId) {
      throw new NotFoundException('Conversation is not linked to a product');
    }
    return {
      id: conversation.id,
      productId: conversation.productId,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
    };
  }

  private toChatMessage(message: {
    id: string;
    role: string;
    content: string;
    createdAt: Date;
  }): AiChatMessage {
    return {
      id: message.id,
      role: message.role as 'USER' | 'ASSISTANT',
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
