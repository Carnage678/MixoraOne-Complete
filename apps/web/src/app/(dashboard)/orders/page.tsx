'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { listOrders } from '@/lib/api-client/payments';
import type { OrderSummary } from '@mixoraone/contracts';

function formatMoney(cents: number, currency: string): string {
  if (cents === 0) {
    return 'Free';
  }
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function OrdersPage() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState<OrderSummary[]>([]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    listOrders(accessToken)
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [accessToken]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
      <p className="mt-1 text-sm text-slate-400">Your purchase history on MixoraOne.</p>

      <div className="mt-8 space-y-3">
        {orders.length === 0 && (
          <p className="rounded-xl bg-surface-muted p-6 text-sm text-slate-400">
            No orders yet. Browse the{' '}
            <Link href="/marketplace" className="text-brand-500 hover:underline">
              marketplace
            </Link>{' '}
            to get started.
          </p>
        )}
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/orders/${order.id}`}
            className="block rounded-xl bg-surface-muted p-5 transition hover:bg-surface-muted/80"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{order.primaryProductName ?? 'Order'}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {new Date(order.createdAt).toLocaleString()} · {order.itemCount} item
                  {order.itemCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-brand-500">
                  {formatMoney(order.totalCents, order.currency)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {order.status.toLowerCase()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
