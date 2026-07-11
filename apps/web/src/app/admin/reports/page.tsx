'use client';

import type { ReportRecord, ReportStatus } from '@mixoraone/contracts';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { listAdminReports } from '@/lib/api-client/admin';

const STATUS_FILTERS: Array<ReportStatus | 'ALL'> = ['ALL', 'OPEN', 'REVIEWED', 'DISMISSED'];

export default function AdminReportsPage() {
  const { accessToken } = useAuth();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [filter, setFilter] = useState<ReportStatus | 'ALL'>('OPEN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    listAdminReports(accessToken)
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const filteredReports = useMemo(() => {
    if (filter === 'ALL') return reports;
    return reports.filter((report) => report.status === filter);
  }, [reports, filter]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">User reports</h1>
      <p className="mt-1 text-sm text-slate-400">
        Content and behavior reports submitted by marketplace users.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filter === status
                ? 'bg-brand-600 text-white'
                : 'border border-white/15 text-slate-300 hover:border-white/30'
            }`}
          >
            {status === 'ALL' ? 'All' : status.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        {loading && <p className="text-sm text-slate-400">Loading reports…</p>}
        {!loading && filteredReports.length === 0 && (
          <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
            No reports match this filter.
          </p>
        )}
        {filteredReports.map((report) => (
          <div key={report.id} className="rounded-xl bg-surface-muted p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">
                  {report.targetType.toLowerCase()} · {report.targetId}
                </p>
                <p className="mt-2 text-sm text-slate-300">{report.reason}</p>
                {report.details && (
                  <p className="mt-2 text-sm text-slate-400">{report.details}</p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  report.status === 'OPEN'
                    ? 'bg-amber-500/15 text-amber-300'
                    : report.status === 'REVIEWED'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-500/15 text-slate-400'
                }`}
              >
                {report.status.toLowerCase()}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Reported {new Date(report.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
