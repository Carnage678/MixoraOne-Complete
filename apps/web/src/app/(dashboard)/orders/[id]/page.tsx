'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { getOrder } from '@/lib/api-client/payments';
import type { OrderDetail } from '@mixoraone/contracts';
import { ApiClientError } from '@/lib/api-client/http';

function formatMoney(cents: number, currency: string): string {
  if (cents === 0) {
    return 'Free';
  }
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    getOrder(accessToken, params.id)
      .then(setOrder)
      .catch((cause) =>
        setError(cause instanceof ApiClientError ? cause.message : 'Order not found'),
      );
  }, [accessToken, params.id]);

  if (!accessToken) {
    return null;
  }
  if (error) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-red-400">{error}</div>;
  }
  if (!order) {
    return <div className="mx-auto max-w-3xl px-6 py-12 text-slate-400">Loading order…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href="/orders" className="text-sm text-brand-500 hover:underline">
        ← All orders
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">
        {order.primaryProductName ?? 'Order'}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {new Date(order.createdAt).toLocaleString()} ·{' '}
        <span className="uppercase">{order.status}</span>
      </p>

      <section className="mt-8 rounded-xl bg-surface-muted p-6">
        <h2 className="text-lg font-semibold">Items</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{item.productName}</p>
                <p className="text-slate-400">
                  {item.planName} · {item.pricingType.toLowerCase()}
                </p>
              </div>
              <p>{formatMoney(item.unitPriceCents, item.currency)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-white/10 pt-4 text-right font-semibold">
          Total {formatMoney(order.totalCents, order.currency)}
        </p>
      </section>

      {order.invoice && (
        <section className="mt-6 rounded-xl bg-surface-muted p-6">
          <h2 className="text-lg font-semibold">Invoice</h2>
          <p className="mt-2 text-sm text-slate-300">{order.invoice.number}</p>
          <p className="mt-1 text-sm text-slate-400">
            {order.invoice.status} · {formatMoney(order.invoice.amountCents, order.invoice.currency)}
          </p>
        </section>
      )}
    </div>
  );
}
