'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { listLicenses } from '@/lib/api-client/licensing';
import type { LicenseSummary } from '@mixoraone/contracts';

export default function LicensesPage() {
  const { accessToken } = useAuth();
  const [licenses, setLicenses] = useState<LicenseSummary[]>([]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    listLicenses(accessToken)
      .then(setLicenses)
      .catch(() => setLicenses([]));
  }, [accessToken]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Licenses</h1>
      <p className="mt-1 text-sm text-slate-400">
        Software entitlements from your purchases, with seats and device activations.
      </p>

      <div className="mt-8 space-y-3">
        {licenses.length === 0 && (
          <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
            No licenses yet. Purchase software from the{' '}
            <Link href="/marketplace" className="text-brand-500 hover:underline">
              marketplace
            </Link>{' '}
            to unlock access.
          </p>
        )}
        {licenses.map((license) => (
          <Link
            key={license.id}
            href={`/licenses/${license.id}`}
            className="block rounded-xl bg-surface-muted p-5 transition hover:bg-surface-muted/80"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{license.productName}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {license.planName} · key …{license.keyHint}
                </p>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                  {license.status.toLowerCase()}
                  {license.isOwner ? ' · owner' : ' · seat holder'}
                </p>
              </div>
              <div className="text-right text-sm text-slate-300">
                <p>
                  {license.seatsAssigned}/{license.seatLimit} seats
                </p>
                <p className="mt-1">{license.activeActivations} active devices</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
