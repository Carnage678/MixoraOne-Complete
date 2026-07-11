export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmCompletion {
  content: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface LlmOptions {
  maxOutputTokens?: number;
  temperature?: number;
}

/**
 * Port every LLM vendor adapter implements. Business logic depends only on
 * this interface, so OpenAI/Gemini/Anthropic can be swapped via configuration
 * without touching the assistant services.
 */
export interface LlmProviderPort {
  readonly name: string;
  isConfigured(): boolean;
  complete(messages: LlmMessage[], options?: LlmOptions): Promise<LlmCompletion>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
