'use client';

import { useAuth } from '@/features/auth/auth-context';
import { DashboardHeader } from '@/features/dashboard/dashboard-header';
import { DeveloperIdentityCard } from '@/features/dashboard/developer-identity-card';
import { MixoraAiCard } from '@/features/dashboard/mixora-ai-card';
import {
  MOCK_AI_SUGGESTIONS,
  MOCK_CONNECTED_ACCOUNTS,
  MOCK_IDENTITY,
  MOCK_METRICS,
  MOCK_OPPORTUNITIES,
  MOCK_PROJECTS,
} from '@/features/dashboard/mock-data';
import { OpportunitiesSection } from '@/features/dashboard/opportunities-section';
import { PerformanceOverview } from '@/features/dashboard/performance-overview';
import { ProjectShowcase } from '@/features/dashboard/project-showcase';
import { QuickActions } from '@/features/dashboard/quick-actions';
import { SocialGrowthCard } from '@/features/dashboard/social-growth-card';
import { ToastProvider } from '@/features/dashboard/toast';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  // Override mock name with authenticated user name when available
  const identity = { ...MOCK_IDENTITY, name: user.name || MOCK_IDENTITY.name };

  return (
    <ToastProvider>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        {/* ── Header / welcome ─────────────────────────────────── */}
        <DashboardHeader identity={identity} />

        {/* ── Quick actions ────────────────────────────────────── */}
        <div className="mt-8">
          <QuickActions />
        </div>

        {/* ── Identity + Performance ───────────────────────────── */}
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <DeveloperIdentityCard identity={identity} />
          <PerformanceOverview metrics={MOCK_METRICS} />
        </div>

        {/* ── Projects — primary visual focus ──────────────────── */}
        <div className="mt-12">
          <ProjectShowcase projects={MOCK_PROJECTS} />
        </div>

        {/* ── Opportunities + AI + Social ──────────────────────── */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <OpportunitiesSection opportunities={MOCK_OPPORTUNITIES} />
          <div className="flex flex-col gap-6">
            <MixoraAiCard suggestions={MOCK_AI_SUGGESTIONS} />
            <SocialGrowthCard accounts={MOCK_CONNECTED_ACCOUNTS} />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
