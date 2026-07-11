export interface AiChatMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface AiProductRecommendation {
  productSlug: string;
  productName: string;
  reason: string;
}

export interface AiConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
}

export interface AiConversationDetail extends AiConversationSummary {
  messages: AiChatMessage[];
  recommendations: AiProductRecommendation[];
}

export interface SendAiMessageInput {
  content: string;
}

export interface SendAiMessageResult {
  message: AiChatMessage;
  recommendations: AiProductRecommendation[];
}

export type AiListingSuggestionField =
  | 'TAGLINE'
  | 'DESCRIPTION'
  | 'CATEGORY'
  | 'CHANGELOG'
  | 'DOC';

export type AiListingSuggestionStatus = 'PENDING' | 'APPLIED' | 'DISMISSED';

export interface AiListingSuggestion {
  id: string;
  field: AiListingSuggestionField;
  currentValue: string | null;
  suggestedValue: string;
  reason: string;
  status: AiListingSuggestionStatus;
  createdAt: string;
}

export interface CreateDeveloperAssistantSessionInput {
  productId: string;
}

export interface AiDeveloperConversationSummary extends AiConversationSummary {
  productId: string;
}

export interface AiDeveloperConversationDetail extends AiDeveloperConversationSummary {
  messages: AiChatMessage[];
  suggestions: AiListingSuggestion[];
}

export interface SendDeveloperAiMessageResult {
  message: AiChatMessage;
  suggestions: AiListingSuggestion[];
}

export interface ProductSuggestionsResult {
  summary: string;
  suggestions: AiListingSuggestion[];
}

export interface UpdateListingSuggestionInput {
  action: 'APPLY' | 'DISMISS';
}
