import type { HealthReport } from '@mixoraone/contracts';

import { apiGet } from './http';

export async function fetchHealthReport(): Promise<HealthReport | null> {
  try {
    return await apiGet<HealthReport>('/health', { cache: 'no-store' });
  } catch {
    return null;
  }
}
