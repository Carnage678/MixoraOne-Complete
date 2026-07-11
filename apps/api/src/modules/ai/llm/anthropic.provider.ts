import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../core/config/app-config.service';
import type { LlmCompletion, LlmMessage, LlmOptions, LlmProviderPort } from './llm-provider.port';

const API_URL = 'https://api.anthropic.com/v1/messages';

@Injectable()
export class AnthropicLlmProvider implements LlmProviderPort {
  readonly name = 'anthropic';

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return this.config.aiProviderConfig('anthropic') !== null;
  }

  async complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmCompletion> {
    const providerConfig = this.config.aiProviderConfig('anthropic');
    if (!providerConfig) {
      throw new ServiceUnavailableException('Anthropic is not configured');
    }

    const system = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const chat = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': providerConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: providerConfig.model,
        ...(system ? { system } : {}),
        messages: chat,
        max_tokens: options?.maxOutputTokens ?? 1024,
        temperature: options?.temperature ?? 0.4,
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Anthropic request failed');
    }

    const body = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const content = body.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');
    return {
      content,
      provider: this.name,
      model: providerConfig.model,
      inputTokens: body.usage?.input_tokens ?? null,
      outputTokens: body.usage?.output_tokens ?? null,
    };
  }
}
