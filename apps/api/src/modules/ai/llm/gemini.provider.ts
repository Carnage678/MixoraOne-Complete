import { Injectable, ServiceUnavailableException } from '@nestjs/common';

import { AppConfigService } from '../../../core/config/app-config.service';
import type { LlmCompletion, LlmMessage, LlmOptions, LlmProviderPort } from './llm-provider.port';

@Injectable()
export class GeminiLlmProvider implements LlmProviderPort {
  readonly name = 'gemini';

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return this.config.aiProviderConfig('gemini') !== null;
  }

  async complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmCompletion> {
    const providerConfig = this.config.aiProviderConfig('gemini');
    if (!providerConfig) {
      throw new ServiceUnavailableException('Gemini is not configured');
    }

    const systemInstruction = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content)
      .join('\n\n');
    const contents = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${providerConfig.model}:generateContent?key=${providerConfig.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
        contents,
        generationConfig: {
          maxOutputTokens: options?.maxOutputTokens ?? 1024,
          temperature: options?.temperature ?? 0.4,
        },
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Gemini request failed');
    }

    const body = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const content =
      body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
    return {
      content,
      provider: this.name,
      model: providerConfig.model,
      inputTokens: body.usageMetadata?.promptTokenCount ?? null,
      outputTokens: body.usageMetadata?.candidatesTokenCount ?? null,
    };
  }
}
