'use client';

import type { PerformanceMetric } from './mock-data';

function MiniSparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

function MetricCard({ metric }: { metric: PerformanceMetric }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-surface-muted p-5 transition hover:border-white/[0.1]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{metric.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{metric.value}</p>
          <span
            className={`mt-1 inline-block text-xs font-medium ${
              metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-red-400' : 'text-slate-500'
            }`}
          >
            {metric.delta} this month
          </span>
        </div>
        <MiniSparkline
          data={metric.sparkline}
          className={
            metric.trend === 'up' ? 'text-emerald-400/60' : metric.trend === 'down' ? 'text-red-400/60' : 'text-slate-500/60'
          }
        />
      </div>
    </div>
  );
}

function EmptyPerformance() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-8 py-12 text-center">
      <h3 className="font-semibold text-slate-200">No data yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
        Performance metrics will appear once your profile and projects start getting views.
      </p>
    </div>
  );
}

export function PerformanceOverview({ metrics }: { metrics: PerformanceMetric[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Profile Performance</h2>
      {metrics.length === 0 ? (
        <div className="mt-4">
          <EmptyPerformance />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
      )}
    </section>
  );
}
