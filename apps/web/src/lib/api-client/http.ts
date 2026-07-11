import type { ApiResponse } from '@mixoraone/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export class ApiClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  accessToken?: string;
}

/**
 * Thin fetch wrapper around the shared API envelope. All server communication
 * from the web app goes through here so error handling stays in one place.
 * `credentials: 'include'` lets the httpOnly refresh cookie flow to the API.
 */
export async function apiRequest<TData>(
  path: string,
  options: RequestOptions = {},
): Promise<TData> {
  const { body, accessToken, headers, ...init } = options;
  const response = await fetch(`${API_URL}/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      accept: 'application/json',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (response.status === 204) {
    return undefined as TData;
  }

  const envelope = (await response.json()) as ApiResponse<TData>;
  if (!envelope.success) {
    throw new ApiClientError(envelope.error.code, envelope.error.message, envelope.requestId);
  }
  return envelope.data;
}

export function apiGet<TData>(path: string, init?: RequestInit): Promise<TData> {
  return apiRequest<TData>(path, init);
}
