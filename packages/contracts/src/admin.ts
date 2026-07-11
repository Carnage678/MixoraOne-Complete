export const TRUST_CHECK_KINDS = ['DEVELOPER', 'PRODUCT', 'DOMAIN', 'COMPLIANCE'] as const;
export type TrustCheckKind = (typeof TRUST_CHECK_KINDS)[number];

export const TRUST_CHECK_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type TrustCheckStatus = (typeof TRUST_CHECK_STATUSES)[number];

export const MODERATION_CASE_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type ModerationCaseStatus = (typeof MODERATION_CASE_STATUSES)[number];

export const MODERATION_DECISIONS = ['APPROVE', 'REMOVE', 'WARN'] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export const DISPUTE_STATUSES = ['OPEN', 'RESOLVED'] as const;
export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export interface TrustCheckRecord {
  id: string;
  kind: TrustCheckKind;
  subjectType: string;
  subjectId: string;
  status: TrustCheckStatus;
  evidence: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface ModerationCaseRecord {
  id: string;
  reportId: string | null;
  subjectType: string;
  subjectId: string;
  status: ModerationCaseStatus;
  decision: ModerationDecision | null;
  decisionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface DisputeRecord {
  id: string;
  orderId: string | null;
  reporterUserId: string;
  respondentUserId: string | null;
  reason: string;
  status: DisputeStatus;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface TrustCheckDecisionInput {
  status: Extract<TrustCheckStatus, 'APPROVED' | 'REJECTED'>;
  decisionNote?: string;
}

export interface ModerationDecisionInput {
  decision: ModerationDecision;
  decisionNote?: string;
}

export interface ResolveDisputeInput {
  resolution: string;
}
