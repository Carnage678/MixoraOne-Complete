'use client';

import type { DeveloperAnalyticsOverview } from '@mixoraone/contracts';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { fetchDeveloperOverview } from '@/lib/api-client/analytics';

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

export default function DeveloperAnalyticsPage() {
  const { accessToken } = useAuth();
  const [overview, setOverview] = useState<DeveloperAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    fetchDeveloperOverview(accessToken)
      .then(setOverview)
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [accessToken]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-slate-400">
        Performance overview for your published products.
      </p>

      {loading && <p className="mt-8 text-sm text-slate-400">Loading analytics…</p>}

      {!loading && !overview && (
        <p className="mt-8 rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
          Analytics are not available yet. Publish a product to start tracking views and sales.
        </p>
      )}

      {overview && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total views" value={overview.totalViews.toLocaleString()} />
            <MetricCard label="Orders" value={overview.totalOrders.toLocaleString()} />
            <MetricCard
              label="Revenue"
              value={formatCurrency(overview.totalRevenueCents)}
            />
            <MetricCard label="Reviews" value={overview.totalReviews.toLocaleString()} />
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold">Product performance</h2>
            <div className="mt-4 space-y-3">
              {overview.products.length === 0 && (
                <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
                  No product metrics yet.
                </p>
              )}
              {overview.products.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between rounded-xl bg-surface-muted p-5"
                >
                  <div>
                    <p className="font-semibold">{product.productName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.views.toLocaleString()} views · {product.orders.toLocaleString()}{' '}
                      orders · {product.reviews.toLocaleString()} reviews
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-brand-500">
                    {formatCurrency(product.revenueCents)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
