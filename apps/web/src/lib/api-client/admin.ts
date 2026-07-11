import type {
  DisputeRecord,
  ModerationCaseRecord,
  ModerationDecisionInput,
  ReportRecord,
  ResolveDisputeInput,
  TrustCheckDecisionInput,
  TrustCheckRecord,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function listTrustChecks(accessToken: string): Promise<TrustCheckRecord[]> {
  return apiRequest<TrustCheckRecord[]>('/admin/trust-checks', { accessToken, cache: 'no-store' });
}

export function decideTrustCheck(
  accessToken: string,
  trustCheckId: string,
  input: TrustCheckDecisionInput,
): Promise<TrustCheckRecord> {
  return apiRequest<TrustCheckRecord>(`/admin/trust-checks/${trustCheckId}/decision`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function listModerationCases(accessToken: string): Promise<ModerationCaseRecord[]> {
  return apiRequest<ModerationCaseRecord[]>('/admin/moderation', { accessToken, cache: 'no-store' });
}

export function decideModerationCase(
  accessToken: string,
  caseId: string,
  input: ModerationDecisionInput,
): Promise<ModerationCaseRecord> {
  return apiRequest<ModerationCaseRecord>(`/admin/moderation/${caseId}/decision`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function listAdminReports(accessToken: string): Promise<ReportRecord[]> {
  return apiRequest<ReportRecord[]>('/admin/reports', { accessToken, cache: 'no-store' });
}

export function listDisputes(accessToken: string): Promise<DisputeRecord[]> {
  return apiRequest<DisputeRecord[]>('/admin/disputes', { accessToken, cache: 'no-store' });
}

export function resolveDispute(
  accessToken: string,
  disputeId: string,
  input: ResolveDisputeInput,
): Promise<DisputeRecord> {
  return apiRequest<DisputeRecord>(`/admin/disputes/${disputeId}/resolve`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
