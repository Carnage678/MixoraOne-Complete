'use client';

import type { AdminAnalyticsOverview, MarketplaceFunnel } from '@mixoraone/contracts';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { fetchAdminOverview, fetchMarketplaceFunnel } from '@/lib/api-client/analytics';

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-muted p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-brand-500">{value}</p>
    </div>
  );
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export default function AdminAnalyticsPage() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [funnel, setFunnel] = useState<MarketplaceFunnel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    void Promise.all([fetchAdminOverview(accessToken), fetchMarketplaceFunnel(accessToken)])
      .then(([overviewData, funnelData]) => {
        setOverview(overviewData);
        setFunnel(funnelData);
      })
      .catch(() => {
        setOverview(null);
        setFunnel(null);
      })
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Platform analytics</h1>
      <p className="mt-1 text-sm text-slate-400">
        Marketplace health, revenue, and conversion funnel.
      </p>

      {loading && <p className="mt-8 text-sm text-slate-400">Loading analytics…</p>}

      {!loading && !overview && (
        <p className="mt-8 rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
          Analytics data is not available yet.
        </p>
      )}

      {overview && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Users" value={overview.totalUsers.toLocaleString()} />
            <MetricCard label="Developers" value={overview.totalDevelopers.toLocaleString()} />
            <MetricCard label="Products" value={overview.totalProducts.toLocaleString()} />
            <MetricCard
              label="Published products"
              value={overview.publishedProducts.toLocaleString()}
            />
            <MetricCard label="Orders" value={overview.totalOrders.toLocaleString()} />
            <MetricCard
              label="Revenue"
              value={formatCurrency(overview.totalRevenueCents)}
            />
            <MetricCard label="Reviews" value={overview.totalReviews.toLocaleString()} />
          </div>

          {funnel && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold">Marketplace funnel</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard label="Searches" value={funnel.searches.toLocaleString()} />
                <MetricCard label="Product views" value={funnel.productViews.toLocaleString()} />
                <MetricCard label="Orders" value={funnel.orders.toLocaleString()} />
                <MetricCard
                  label="Search → view rate"
                  value={formatRate(funnel.searchToViewRate)}
                />
                <MetricCard
                  label="View → order rate"
                  value={formatRate(funnel.viewToOrderRate)}
                />
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
