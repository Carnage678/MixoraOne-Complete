'use client';

import type { ModerationCaseRecord, ModerationDecision } from '@mixoraone/contracts';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { decideModerationCase, listModerationCases } from '@/lib/api-client/admin';
import { ApiClientError } from '@/lib/api-client/http';

const DECISIONS: ModerationDecision[] = ['APPROVE', 'REMOVE', 'WARN'];

export default function AdminModerationPage() {
  const { accessToken } = useAuth();
  const [cases, setCases] = useState<ModerationCaseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadCases = () => {
    if (!accessToken) return;
    listModerationCases(accessToken)
      .then(setCases)
      .catch(() => setCases([]));
  };

  useEffect(() => {
    loadCases();
  }, [accessToken]);

  async function onDecide(caseId: string, decision: ModerationDecision) {
    if (!accessToken) return;
    const note = window.prompt('Decision note (optional)') ?? undefined;
    setPendingId(caseId);
    setError(null);
    try {
      const updated = await decideModerationCase(accessToken, caseId, {
        decision,
        decisionNote: note || undefined,
      });
      setCases((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not resolve case');
    } finally {
      setPendingId(null);
    }
  }

  if (!accessToken) {
    return null;
  }

  const openCases = cases.filter((entry) => entry.status === 'OPEN');
  const resolvedCases = cases.filter((entry) => entry.status === 'RESOLVED');

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Moderation queue</h1>
      <p className="mt-1 text-sm text-slate-400">
        Review flagged content and take action on open moderation cases.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Open cases ({openCases.length})</h2>
        <div className="mt-4 space-y-3">
          {openCases.length === 0 && (
            <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
              No open moderation cases.
            </p>
          )}
          {openCases.map((entry) => (
            <div key={entry.id} className="rounded-xl bg-surface-muted p-5">
              <p className="text-sm font-semibold">
                {entry.subjectType} · {entry.subjectId}
              </p>
              {entry.reportId && (
                <p className="mt-1 text-xs text-slate-500">Report {entry.reportId}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Opened {new Date(entry.createdAt).toLocaleString()}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {DECISIONS.map((decision) => (
                  <button
                    key={decision}
                    type="button"
                    disabled={pendingId === entry.id}
                    onClick={() => void onDecide(entry.id, decision)}
                    className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/30 disabled:opacity-60"
                  >
                    {decision.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recently resolved</h2>
        <div className="mt-4 space-y-3">
          {resolvedCases.length === 0 && (
            <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
              No resolved cases yet.
            </p>
          )}
          {resolvedCases.slice(0, 10).map((entry) => (
            <div key={entry.id} className="rounded-xl bg-surface-muted p-5">
              <p className="text-sm font-semibold">
                {entry.subjectType} · {entry.decision?.toLowerCase() ?? 'resolved'}
              </p>
              {entry.decisionNote && (
                <p className="mt-2 text-sm text-slate-300">{entry.decisionNote}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Resolved {entry.resolvedAt ? new Date(entry.resolvedAt).toLocaleString() : '—'}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
