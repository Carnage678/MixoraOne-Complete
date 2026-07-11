import { Module } from '@nestjs/common';

import { AppConfigService } from '../../core/config/app-config.service';
import { RateLimitService } from '../../core/rate-limit/rate-limit.service';
import { ProductsModule } from '../products/products.module';
import { AiRequirementsController } from './ai.controller';
import { DeveloperAssistantController } from './developer-assistant.controller';
import { DeveloperAssistantService } from './developer-assistant.service';
import { ListingAnalysisService } from './listing-analysis.service';
import { AnthropicLlmProvider } from './llm/anthropic.provider';
import { GeminiLlmProvider } from './llm/gemini.provider';
import { LLM_PROVIDER, LlmProviderPort } from './llm/llm-provider.port';
import { OpenAiLlmProvider } from './llm/openai.provider';
import { ProductAiController } from './product-ai.controller';
import { RequirementAssistantService } from './requirement-assistant.service';

/** Provider selected by AI_PROVIDER env; unconfigured setups get a stub that reports not-ready. */
const llmProviderFactory = {
  provide: LLM_PROVIDER,
  useFactory: (
    config: AppConfigService,
    openai: OpenAiLlmProvider,
    gemini: GeminiLlmProvider,
    anthropic: AnthropicLlmProvider,
  ): LlmProviderPort => {
    switch (config.aiProvider) {
      case 'openai':
        return openai;
      case 'gemini':
        return gemini;
      case 'anthropic':
        return anthropic;
      default:
        return {
          name: 'unconfigured',
          isConfigured: () => false,
          complete: async () => {
            throw new Error('No AI provider configured');
          },
        };
    }
  },
  inject: [AppConfigService, OpenAiLlmProvider, GeminiLlmProvider, AnthropicLlmProvider],
};

@Module({
  imports: [ProductsModule],
  controllers: [AiRequirementsController, DeveloperAssistantController, ProductAiController],
  providers: [
    OpenAiLlmProvider,
    GeminiLlmProvider,
    AnthropicLlmProvider,
    llmProviderFactory,
    RequirementAssistantService,
    DeveloperAssistantService,
    ListingAnalysisService,
    RateLimitService,
  ],
  exports: [LLM_PROVIDER],
})
export class AiModule {}
