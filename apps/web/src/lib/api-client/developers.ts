import type {
  CreateDeveloperProfileInput,
  DeveloperProfile,
  PublicDeveloperProfile,
  SubmitVerificationInput,
  UpdateDeveloperProfileInput,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function fetchOwnDeveloperProfile(accessToken: string): Promise<DeveloperProfile> {
  return apiRequest<DeveloperProfile>('/developers/me', { accessToken });
}

export function createDeveloperProfile(
  accessToken: string,
  input: CreateDeveloperProfileInput,
): Promise<DeveloperProfile> {
  return apiRequest<DeveloperProfile>('/developers/me', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function updateDeveloperProfile(
  accessToken: string,
  input: UpdateDeveloperProfileInput,
): Promise<DeveloperProfile> {
  return apiRequest<DeveloperProfile>('/developers/me', {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

export function submitVerification(
  accessToken: string,
  input: SubmitVerificationInput,
): Promise<{ status: 'PENDING' }> {
  return apiRequest<{ status: 'PENDING' }>('/developers/me/verification', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function fetchPublicDeveloper(slug: string): Promise<PublicDeveloperProfile> {
  return apiRequest<PublicDeveloperProfile>(`/developers/${slug}`, { cache: 'no-store' });
}
