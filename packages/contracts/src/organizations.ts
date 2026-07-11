export const ORGANIZATION_ROLES = ['OWNER', 'MEMBER'] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  /** Role of the requesting user within this organization. */
  myRole: OrganizationRole;
  memberCount: number;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  joinedAt: string;
}

export interface CreateOrganizationInput {
  name: string;
}

export interface AddMemberInput {
  email: string;
  role?: OrganizationRole;
}

export interface UpdateProfileInput {
  name?: string;
}
