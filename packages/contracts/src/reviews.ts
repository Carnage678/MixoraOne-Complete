export const REVIEW_STATUSES = ['PUBLISHED', 'HIDDEN', 'REMOVED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REPORT_TARGET_TYPES = ['REVIEW', 'QUESTION', 'PRODUCT', 'USER'] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_STATUSES = ['OPEN', 'REVIEWED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReviewReplyRecord {
  id: string;
  body: string;
  developerDisplayName: string;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  status: ReviewStatus;
  replies: ReviewReplyRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface AnswerRecord {
  id: string;
  userId: string;
  userName: string;
  body: string;
  createdAt: string;
}

export interface QuestionRecord {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  title: string;
  body: string;
  answers: AnswerRecord[];
  createdAt: string;
}

export interface FeedbackRecord {
  id: string;
  subject: string;
  body: string;
  productId: string | null;
  createdAt: string;
}

export interface ReportRecord {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  rating: number;
  title?: string;
  body: string;
}

export interface CreateReviewReplyInput {
  body: string;
}

export interface CreateQuestionInput {
  title: string;
  body: string;
}

export interface CreateAnswerInput {
  body: string;
}

export interface CreateFeedbackInput {
  subject: string;
  body: string;
  productId?: string;
}

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
}
