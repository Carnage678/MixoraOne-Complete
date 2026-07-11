import type {
  CreateAnswerInput,
  CreateFeedbackInput,
  CreateQuestionInput,
  CreateReportInput,
  CreateReviewInput,
  CreateReviewReplyInput,
  FeedbackRecord,
  QuestionRecord,
  ReportRecord,
  ReviewRecord,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function listProductReviews(productId: string): Promise<ReviewRecord[]> {
  return apiRequest<ReviewRecord[]>(`/products/${productId}/reviews`, { cache: 'no-store' });
}

export function createReview(
  accessToken: string,
  productId: string,
  input: CreateReviewInput,
): Promise<ReviewRecord> {
  return apiRequest<ReviewRecord>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function createReviewReply(
  accessToken: string,
  reviewId: string,
  input: CreateReviewReplyInput,
): Promise<ReviewRecord> {
  return apiRequest<ReviewRecord>(`/reviews/${reviewId}/replies`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function listProductQuestions(productId: string): Promise<QuestionRecord[]> {
  return apiRequest<QuestionRecord[]>(`/products/${productId}/questions`, {
    cache: 'no-store',
  });
}

export function createQuestion(
  accessToken: string,
  productId: string,
  input: CreateQuestionInput,
): Promise<QuestionRecord> {
  return apiRequest<QuestionRecord>(`/products/${productId}/questions`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function createAnswer(
  accessToken: string,
  questionId: string,
  input: CreateAnswerInput,
): Promise<QuestionRecord> {
  return apiRequest<QuestionRecord>(`/questions/${questionId}/answers`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function createReport(accessToken: string, input: CreateReportInput): Promise<ReportRecord> {
  return apiRequest<ReportRecord>('/reports', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function submitFeedback(
  accessToken: string,
  input: CreateFeedbackInput,
): Promise<FeedbackRecord> {
  return apiRequest<FeedbackRecord>('/feedback', {
    method: 'POST',
    body: input,
    accessToken,
  });
}
