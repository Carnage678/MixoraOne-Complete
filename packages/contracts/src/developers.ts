export const VERIFICATION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Public view of a developer profile (safe for anonymous visitors). */
export interface PublicDeveloperProfile {
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  skills: string[];
  verified: boolean;
  memberSince: string;
}

/** Owner view: public fields plus verification state. */
export interface DeveloperProfile extends PublicDeveloperProfile {
  id: string;
  verificationStatus: VerificationStatus | null;
  verificationNote: string | null;
}

export interface CreateDeveloperProfileInput {
  displayName: string;
  headline?: string;
  bio?: string;
  websiteUrl?: string;
  githubUrl?: string;
  skills?: string[];
}

export type UpdateDeveloperProfileInput = Partial<CreateDeveloperProfileInput>;

export interface SubmitVerificationInput {
  legalName: string;
  country: string;
  websiteUrl?: string;
  evidenceUrl?: string;
  note?: string;
}
