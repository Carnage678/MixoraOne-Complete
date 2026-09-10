'use client';

import Link from 'next/link';

import type { AiSuggestion } from './mock-data';

const TYPE_ICONS: Record<AiSuggestion['type'], string> = {
  profile: '👤',
  project: '📦',
  growth: '📈',
};

function EmptyAi() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center">
      <p className="text-sm text-slate-400">No suggestions right now. Check back soon.</p>
    </div>
  );
}

export function MixoraAiCard({ suggestions }: { suggestions: AiSuggestion[] }) {
  return (
    <section className="rounded-xl border border-brand-500/10 bg-gradient-to-br from-brand-600/[0.04] to-violet-600/[0.04] p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600/20 text-xs">✨</span>
            Mixora AI
          </h2>
          <p className="mt-0.5 text-sm text-slate-400">Suggestions to help you stand out.</p>
        </div>
        <span className="rounded-full bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-500">
          {suggestions.length} suggestions
        </span>
      </div>

      {suggestions.length === 0 ? (
        <div className="mt-4">
          <EmptyAi />
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-surface/50 px-4 py-3"
            >
              <span className="mt-0.5 text-base">{TYPE_ICONS[suggestion.type]}</span>
              <p className="text-sm leading-relaxed text-slate-300">{suggestion.text}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Link
          href="/assistant"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Improve my profile
        </Link>
        <Link
          href="/assistant"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
        >
          Review suggestions
        </Link>
      </div>
    </section>
  );
}
