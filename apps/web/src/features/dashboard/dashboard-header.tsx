'use client';

import Link from 'next/link';

import type { DeveloperIdentity } from './mock-data';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardHeader({ identity }: { identity: DeveloperIdentity }) {
  const firstName = identity.name.split(' ')[0];

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Your developer profile is your professional home on MixoraOne.
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Profile completion indicator */}
        <div className="flex items-center gap-3 rounded-lg border border-white/10 px-4 py-2.5">
          <div className="relative h-8 w-8">
            <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-white/10"
              />
              <circle
                cx="18"
                cy="18"
                r="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${identity.profileCompletion * 0.88} 88`}
                strokeLinecap="round"
                className="text-brand-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-200">
              {identity.profileCompletion}%
            </span>
          </div>
          <span className="text-xs text-slate-400">Profile</span>
        </div>

        <Link
          href="/developer"
          className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/5"
        >
          Complete profile
        </Link>
        <Link
          href={`/developers/${identity.profileSlug}`}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          View public profile
        </Link>
      </div>
    </div>
  );
}
