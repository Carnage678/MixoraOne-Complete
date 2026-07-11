export const LICENSE_STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'] as const;
export type LicenseStatus = (typeof LICENSE_STATUSES)[number];

export interface LicenseSummary {
  id: string;
  productId: string;
  productName: string;
  planName: string;
  status: LicenseStatus;
  keyHint: string;
  seatLimit: number;
  seatsAssigned: number;
  activeActivations: number;
  expiresAt: string | null;
  createdAt: string;
  isOwner: boolean;
}

export interface LicenseSeatRecord {
  id: string;
  assignedUserId: string | null;
  assignedEmail: string | null;
  assignedAt: string | null;
  activeActivations: number;
}

export interface LicenseActivationRecord {
  id: string;
  deviceId: string;
  deviceName: string | null;
  lastSeenAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface LicenseEntitlements {
  licenseId: string;
  status: LicenseStatus;
  valid: boolean;
  productId: string;
  productName: string;
  seatLimit: number;
  seatsAssigned: number;
  activeActivations: number;
  expiresAt: string | null;
  features: string[];
}

export interface ActivateLicenseInput {
  deviceId: string;
  deviceName?: string;
}

export interface ActivateLicenseResult {
  activationId: string;
  activationToken: string;
  expiresAt: string | null;
}

export interface DeactivateLicenseInput {
  activationId: string;
}

export interface AssignLicenseSeatInput {
  email: string;
}

export interface AssignLicenseSeatResult {
  seat: LicenseSeatRecord;
}

export interface GrantLicenseResult {
  licenseId: string;
  licenseKey: string;
  keyHint: string;
}
