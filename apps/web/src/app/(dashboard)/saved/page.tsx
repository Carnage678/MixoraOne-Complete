'use client';

import type { ProductSummary } from '@mixoraone/contracts';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { ProductCard } from '@/features/marketplace/product-card';
import { listFavorites } from '@/lib/api-client/marketplace';

export default function SavedProductsPage() {
  const { accessToken } = useAuth();
  const [products, setProducts] = useState<ProductSummary[] | null>(null);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    listFavorites(accessToken)
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [accessToken]);

  if (!accessToken) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Saved products</h1>
      <p className="mt-2 text-slate-300">Products you bookmarked while browsing.</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>

      {products === null && <p className="mt-8 text-sm text-slate-400">Loading…</p>}
      {products?.length === 0 && (
        <p className="mt-8 text-sm text-slate-400">
          Nothing saved yet.{' '}
          <Link href="/marketplace" className="text-brand-500 hover:underline">
            Browse the marketplace
          </Link>{' '}
          and save products you like.
        </p>
      )}
    </div>
  );
}
