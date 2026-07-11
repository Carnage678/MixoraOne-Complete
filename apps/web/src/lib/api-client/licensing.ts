import type {
  ActivateLicenseInput,
  ActivateLicenseResult,
  AssignLicenseSeatInput,
  AssignLicenseSeatResult,
  DeactivateLicenseInput,
  LicenseActivationRecord,
  LicenseEntitlements,
  LicenseSeatRecord,
  LicenseSummary,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function listLicenses(accessToken: string): Promise<LicenseSummary[]> {
  return apiRequest<LicenseSummary[]>('/licenses', { accessToken });
}

export function getLicenseEntitlements(
  accessToken: string,
  licenseId: string,
): Promise<LicenseEntitlements> {
  return apiRequest<LicenseEntitlements>(`/licenses/${licenseId}/entitlements`, { accessToken });
}

export function listLicenseSeats(
  accessToken: string,
  licenseId: string,
): Promise<LicenseSeatRecord[]> {
  return apiRequest<LicenseSeatRecord[]>(`/licenses/${licenseId}/seats`, { accessToken });
}

export function assignLicenseSeat(
  accessToken: string,
  licenseId: string,
  input: AssignLicenseSeatInput,
): Promise<AssignLicenseSeatResult> {
  return apiRequest<AssignLicenseSeatResult>(`/licenses/${licenseId}/seats`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function listLicenseActivations(
  accessToken: string,
  licenseId: string,
): Promise<LicenseActivationRecord[]> {
  return apiRequest<LicenseActivationRecord[]>(`/licenses/${licenseId}/activations`, {
    accessToken,
  });
}

export function activateLicense(
  accessToken: string,
  licenseId: string,
  input: ActivateLicenseInput,
): Promise<ActivateLicenseResult> {
  return apiRequest<ActivateLicenseResult>(`/licenses/${licenseId}/activate`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function deactivateLicense(
  accessToken: string,
  licenseId: string,
  input: DeactivateLicenseInput,
): Promise<{ ok: true }> {
  return apiRequest<{ ok: true }>(`/licenses/${licenseId}/deactivate`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}
