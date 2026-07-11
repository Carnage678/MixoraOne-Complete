import type {
  AddMemberInput,
  AuthUser,
  CreateOrganizationInput,
  Organization,
  OrganizationMember,
  UpdateProfileInput,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function updateProfile(accessToken: string, input: UpdateProfileInput): Promise<AuthUser> {
  return apiRequest<AuthUser>('/users/me', { method: 'PATCH', body: input, accessToken });
}

export function listOrganizations(accessToken: string): Promise<Organization[]> {
  return apiRequest<Organization[]>('/organizations', { accessToken });
}

export function createOrganization(
  accessToken: string,
  input: CreateOrganizationInput,
): Promise<Organization> {
  return apiRequest<Organization>('/organizations', { method: 'POST', body: input, accessToken });
}

export function listMembers(
  accessToken: string,
  organizationId: string,
): Promise<OrganizationMember[]> {
  return apiRequest<OrganizationMember[]>(`/organizations/${organizationId}/members`, {
    accessToken,
  });
}

export function addMember(
  accessToken: string,
  organizationId: string,
  input: AddMemberInput,
): Promise<OrganizationMember> {
  return apiRequest<OrganizationMember>(`/organizations/${organizationId}/members`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function removeMember(
  accessToken: string,
  organizationId: string,
  userId: string,
): Promise<void> {
  return apiRequest<void>(`/organizations/${organizationId}/members/${userId}`, {
    method: 'DELETE',
    accessToken,
  });
}
