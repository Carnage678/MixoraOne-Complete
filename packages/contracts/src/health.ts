export const HEALTH_COMPONENTS = ['database', 'redis'] as const;

export type HealthComponent = (typeof HEALTH_COMPONENTS)[number];

export type HealthComponentStatus = 'up' | 'down';

/** 'ok' means every dependency is reachable; 'degraded' means the API process is up but a dependency is down. */
export type HealthStatus = 'ok' | 'degraded';

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  uptimeSeconds: number;
  components: Record<HealthComponent, HealthComponentStatus>;
}
