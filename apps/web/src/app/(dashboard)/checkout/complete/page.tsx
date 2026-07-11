'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { getOrder } from '@/lib/api-client/payments';
import { ApiClientError } from '@/lib/api-client/http';

export default function CheckoutCompletePage() {
  const { accessToken } = useAuth();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !orderId) {
      return;
    }
    getOrder(accessToken, orderId)
      .then((order) => setStatus(order.status))
      .catch((cause) =>
        setError(cause instanceof ApiClientError ? cause.message : 'Could not load order'),
      );
  }, [accessToken, orderId]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {!error && !status && <p className="mt-4 text-slate-400">Loading your order…</p>}
      {status === 'PENDING' && (
        <div className="mt-6 rounded-xl bg-amber-500/10 p-6 text-sm text-amber-200">
          Payment is still processing. In local development with the mock provider, complete the
          purchase by sending the signed webhook from your API tests or tooling.
        </div>
      )}
      {status === 'PAID' && (
        <div className="mt-6 rounded-xl bg-emerald-500/10 p-6 text-sm text-emerald-200">
          Payment confirmed. Your order is ready.
          {orderId && (
            <Link href={`/orders/${orderId}`} className="mt-4 block font-semibold text-brand-500">
              View order →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
