import type {
  AiConversationDetail,
  AiConversationSummary,
  AiDeveloperConversationSummary,
  AiListingSuggestion,
  ProductSuggestionsResult,
  SendAiMessageResult,
  SendDeveloperAiMessageResult,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function createAiSession(accessToken: string): Promise<AiConversationSummary> {
  return apiRequest<AiConversationSummary>('/ai/requirements/sessions', {
    method: 'POST',
    accessToken,
  });
}

export function listAiSessions(accessToken: string): Promise<AiConversationSummary[]> {
  return apiRequest<AiConversationSummary[]>('/ai/requirements/sessions', { accessToken });
}

export function getAiSession(
  accessToken: string,
  sessionId: string,
): Promise<AiConversationDetail> {
  return apiRequest<AiConversationDetail>(`/ai/requirements/sessions/${sessionId}`, {
    accessToken,
  });
}

export function sendAiMessage(
  accessToken: string,
  sessionId: string,
  content: string,
): Promise<SendAiMessageResult> {
  return apiRequest<SendAiMessageResult>(`/ai/requirements/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { content },
    accessToken,
  });
}

export function createDeveloperAssistantSession(
  accessToken: string,
  productId: string,
): Promise<AiDeveloperConversationSummary> {
  return apiRequest(`/ai/developer-assistant/sessions`, {
    method: 'POST',
    body: { productId },
    accessToken,
  });
}

export function sendDeveloperAssistantMessage(
  accessToken: string,
  sessionId: string,
  content: string,
): Promise<SendDeveloperAiMessageResult> {
  return apiRequest(`/ai/developer-assistant/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: { content },
    accessToken,
  });
}

export function analyzeProductListing(
  accessToken: string,
  productId: string,
): Promise<ProductSuggestionsResult> {
  return apiRequest(`/ai/products/${productId}/suggestions`, {
    method: 'POST',
    accessToken,
  });
}

export function listProductSuggestions(
  accessToken: string,
  productId: string,
): Promise<AiListingSuggestion[]> {
  return apiRequest(`/ai/products/${productId}/suggestions`, { accessToken });
}

export function resolveProductSuggestion(
  accessToken: string,
  productId: string,
  suggestionId: string,
  action: 'APPLY' | 'DISMISS',
): Promise<AiListingSuggestion> {
  return apiRequest(`/ai/products/${productId}/suggestions/${suggestionId}`, {
    method: 'PATCH',
    body: { action },
    accessToken,
  });
}
