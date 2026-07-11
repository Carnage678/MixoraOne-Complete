'use client';

import type { ProductPricingPlan } from '@mixoraone/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { createCheckoutSession } from '@/lib/api-client/payments';
import { ApiClientError } from '@/lib/api-client/http';

export function PurchaseButton({
  plan,
  productSlug,
}: {
  plan: ProductPricingPlan;
  productSlug: string;
}) {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPurchase() {
    if (!accessToken) {
      router.push(`/sign-in?next=/marketplace/${productSlug}`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const session = await createCheckoutSession(
        accessToken,
        {
          pricingPlanId: plan.id,
          successPath: '/checkout/complete',
          cancelPath: `/marketplace/${productSlug}`,
        },
        `purchase-${plan.id}`,
      );
      if (session.status === 'PAID') {
        router.push(`/orders/${session.orderId}`);
        return;
      }
      if (session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
        return;
      }
      router.push(`/orders/${session.orderId}`);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Checkout failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => void onPurchase()}
        className="mt-3 w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-500 disabled:opacity-60"
      >
        {plan.type === 'FREE' ? 'Get for free' : pending ? 'Starting checkout…' : 'Purchase'}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
