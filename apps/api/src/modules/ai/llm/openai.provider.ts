import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../core/config/app-config.service';
import type { LlmCompletion, LlmMessage, LlmOptions, LlmProviderPort } from './llm-provider.port';

const API_URL = 'https://api.openai.com/v1/chat/completions';

@Injectable()
export class OpenAiLlmProvider implements LlmProviderPort {
  readonly name = 'openai';

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return this.config.aiProviderConfig('openai') !== null;
  }

  async complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmCompletion> {
    const providerConfig = this.config.aiProviderConfig('openai');
    if (!providerConfig) {
      throw new ServiceUnavailableException('OpenAI is not configured');
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${providerConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: providerConfig.model,
        messages,
        max_tokens: options?.maxOutputTokens ?? 1024,
        temperature: options?.temperature ?? 0.4,
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('OpenAI request failed');
    }

    const body = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      content: body.choices[0]?.message.content ?? '',
      provider: this.name,
      model: providerConfig.model,
      inputTokens: body.usage?.prompt_tokens ?? null,
      outputTokens: body.usage?.completion_tokens ?? null,
    };
  }
}
