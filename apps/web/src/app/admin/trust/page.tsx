'use client';

import type { DisputeRecord, TrustCheckRecord } from '@mixoraone/contracts';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import {
  decideTrustCheck,
  listDisputes,
  listTrustChecks,
  resolveDispute,
} from '@/lib/api-client/admin';
import { ApiClientError } from '@/lib/api-client/http';

export default function AdminTrustPage() {
  const { accessToken } = useAuth();
  const [trustChecks, setTrustChecks] = useState<TrustCheckRecord[]>([]);
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loadData = () => {
    if (!accessToken) return;
    void Promise.all([listTrustChecks(accessToken), listDisputes(accessToken)])
      .then(([checks, disputeList]) => {
        setTrustChecks(checks);
        setDisputes(disputeList);
      })
      .catch(() => {
        setTrustChecks([]);
        setDisputes([]);
      });
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  async function onTrustDecision(checkId: string, status: 'APPROVED' | 'REJECTED') {
    if (!accessToken) return;
    const note = window.prompt('Decision note (optional)') ?? undefined;
    setPendingId(checkId);
    setError(null);
    try {
      const updated = await decideTrustCheck(accessToken, checkId, {
        status,
        decisionNote: note || undefined,
      });
      setTrustChecks((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not decide trust check');
    } finally {
      setPendingId(null);
    }
  }

  async function onResolveDispute(disputeId: string) {
    if (!accessToken) return;
    const resolution = window.prompt('Resolution summary');
    if (!resolution?.trim()) return;
    setPendingId(disputeId);
    setError(null);
    try {
      const updated = await resolveDispute(accessToken, disputeId, {
        resolution: resolution.trim(),
      });
      setDisputes((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not resolve dispute');
    } finally {
      setPendingId(null);
    }
  }

  if (!accessToken) {
    return null;
  }

  const pendingChecks = trustChecks.filter((entry) => entry.status === 'PENDING');

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Trust &amp; verification</h1>
      <p className="mt-1 text-sm text-slate-400">
        Approve developer and product trust checks, and resolve purchase disputes.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pending trust checks ({pendingChecks.length})</h2>
        <div className="mt-4 space-y-3">
          {pendingChecks.length === 0 && (
            <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
              No pending trust checks.
            </p>
          )}
          {pendingChecks.map((check) => (
            <div key={check.id} className="rounded-xl bg-surface-muted p-5">
              <p className="text-sm font-semibold">
                {check.kind.toLowerCase()} · {check.subjectType}
              </p>
              <p className="mt-1 text-xs text-slate-500">Subject {check.subjectId}</p>
              {check.evidence && (
                <p className="mt-2 text-sm text-slate-300">{check.evidence}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Submitted {new Date(check.createdAt).toLocaleString()}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={pendingId === check.id}
                  onClick={() => void onTrustDecision(check.id, 'APPROVED')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={pendingId === check.id}
                  onClick={() => void onTrustDecision(check.id, 'REJECTED')}
                  className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Open disputes</h2>
        <div className="mt-4 space-y-3">
          {disputes.filter((entry) => entry.status === 'OPEN').length === 0 && (
            <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
              No open disputes.
            </p>
          )}
          {disputes
            .filter((entry) => entry.status === 'OPEN')
            .map((dispute) => (
              <div key={dispute.id} className="rounded-xl bg-surface-muted p-5">
                <p className="text-sm font-semibold">{dispute.reason}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Reporter {dispute.reporterUserId}
                  {dispute.respondentUserId ? ` · Respondent ${dispute.respondentUserId}` : ''}
                  {dispute.orderId ? ` · Order ${dispute.orderId}` : ''}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Filed {new Date(dispute.createdAt).toLocaleString()}
                </p>
                <button
                  type="button"
                  disabled={pendingId === dispute.id}
                  onClick={() => void onResolveDispute(dispute.id)}
                  className="mt-4 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-white/30 disabled:opacity-60"
                >
                  Resolve dispute
                </button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
