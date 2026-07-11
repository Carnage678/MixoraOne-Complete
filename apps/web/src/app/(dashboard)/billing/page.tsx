'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { cancelSubscription, listSubscriptions } from '@/lib/api-client/payments';
import type { SubscriptionRecord } from '@mixoraone/contracts';
import { ApiClientError } from '@/lib/api-client/http';

export default function BillingPage() {
  const { accessToken } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    listSubscriptions(accessToken)
      .then(setSubscriptions)
      .catch(() => setSubscriptions([]));
  }, [accessToken]);

  async function onCancel(subscriptionId: string) {
    if (!accessToken) {
      return;
    }
    setPendingId(subscriptionId);
    setError(null);
    try {
      const updated = await cancelSubscription(accessToken, subscriptionId);
      setSubscriptions((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Could not cancel subscription');
    } finally {
      setPendingId(null);
    }
  }

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
      <p className="mt-1 text-sm text-slate-400">Manage your active software subscriptions.</p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-8 space-y-3">
        {subscriptions.length === 0 && (
          <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
            No subscriptions yet.
          </p>
        )}
        {subscriptions.map((subscription) => (
          <div key={subscription.id} className="rounded-xl bg-surface-muted p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{subscription.productName}</p>
                <p className="mt-1 text-sm text-slate-400">{subscription.planName}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  {subscription.status.toLowerCase()}
                  {subscription.currentPeriodEnd &&
                    ` · renews ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              </div>
              {subscription.status === 'ACTIVE' && (
                <button
                  type="button"
                  disabled={pendingId === subscription.id}
                  onClick={() => void onCancel(subscription.id)}
                  className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400 disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
