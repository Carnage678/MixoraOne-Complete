import type { Metadata } from 'next';

import { fetchHealthReport } from '@/lib/api-client/health';

export const metadata: Metadata = {
  title: 'Platform Status',
};

export const dynamic = 'force-dynamic';

function StatusPill({ up, label }: { up: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-muted px-4 py-3">
      <span className="text-sm text-slate-200">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
        }`}
      >
        {up ? 'Operational' : 'Down'}
      </span>
    </div>
  );
}

export default async function StatusPage() {
  const report = await fetchHealthReport();

  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="text-3xl font-bold tracking-tight">Platform status</h1>
      <p className="mt-3 text-slate-300">
        Live health of the MixoraOne API and its core dependencies.
      </p>

      <div className="mt-10 space-y-3">
        <StatusPill up={report !== null} label="API" />
        <StatusPill up={report?.components.database === 'up'} label="Database (PostgreSQL)" />
        <StatusPill up={report?.components.redis === 'up'} label="Cache (Redis)" />
      </div>

      {report ? (
        <p className="mt-6 text-xs text-slate-500">
          Last checked {new Date(report.timestamp).toLocaleString()} - API uptime{' '}
          {report.uptimeSeconds}s
        </p>
      ) : (
        <p className="mt-6 text-xs text-slate-500">
          The API is unreachable. Start it with <code>pnpm dev</code> and ensure Docker services are
          running.
        </p>
      )}
    </div>
  );
}
