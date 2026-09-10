'use client';

import { useState } from 'react';

import type { Opportunity } from './mock-data';
import { useToast } from './toast';

// ─── Modal ───────────────────────────────────────────────────────────────────

function OpportunityModal({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-surface-muted p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-200"
          aria-label="Close"
        >
          ✕
        </button>
        <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-sm font-bold text-white ${opportunity.avatarColor}`}>
          {opportunity.company.charAt(0)}
        </div>
        <h3 className="text-lg font-semibold">{opportunity.company}</h3>
        <p className="mt-1 text-sm text-brand-500">{opportunity.role}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">{opportunity.note}</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            Respond
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/5"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<Opportunity['status'], string> = {
  new: 'bg-brand-500/10 text-brand-500',
  reviewing: 'bg-amber-500/10 text-amber-400',
  responded: 'bg-emerald-500/10 text-emerald-400',
};

function OpportunityCard({
  opportunity,
  onView,
}: {
  opportunity: Opportunity;
  onView: () => void;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-white/[0.06] bg-surface-muted p-5 transition hover:border-white/[0.12]">
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${opportunity.avatarColor}`}>
        {opportunity.company.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm">{opportunity.company}</h3>
            <p className="text-xs text-slate-400">{opportunity.role}</p>
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[opportunity.status]}`}>
            {opportunity.status}
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-400">{opportunity.note}</p>
        <button
          type="button"
          onClick={onView}
          className="mt-3 text-xs font-medium text-brand-500 transition hover:text-brand-400"
        >
          View opportunity →
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyOpportunities() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-8 py-12 text-center">
      <h3 className="font-semibold text-slate-200">No opportunities yet</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-400">
        Complete your profile and showcase projects to start receiving interest from companies.
      </p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function OpportunitiesSection({ opportunities }: { opportunities: Opportunity[] }) {
  const [viewing, setViewing] = useState<Opportunity | null>(null);
  const _toast = useToast();

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Opportunities</h2>
      <p className="mt-0.5 text-sm text-slate-400">People interested in your work.</p>

      {opportunities.length === 0 ? (
        <div className="mt-4">
          <EmptyOpportunities />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} onView={() => setViewing(opp)} />
          ))}
        </div>
      )}

      {viewing && <OpportunityModal opportunity={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}
