'use client';

import type { Product } from '@mixoraone/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth/auth-context';
import { Field, FormError, SubmitButton } from '@/features/auth/auth-form';
import { ApiClientError } from '@/lib/api-client/http';
import { createProduct, listOwnProducts } from '@/lib/api-client/products';

const STATUS_STYLES: Record<Product['status'], string> = {
  DRAFT: 'bg-slate-500/15 text-slate-300',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400',
  ARCHIVED: 'bg-red-500/15 text-red-400',
};

export default function ProductsManagerPage() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!accessToken) {
      return;
    }
    listOwnProducts(accessToken)
      .then((data) => {
        setProducts(data);
        setNeedsProfile(false);
      })
      .catch((cause) => {
        setProducts([]);
        setNeedsProfile(cause instanceof ApiClientError && cause.code === 'FORBIDDEN');
      });
  }, [accessToken]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (!accessToken) {
    return null;
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const product = await createProduct(accessToken!, { name });
      router.push(`/products/${product.id}`);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'Something went wrong');
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Products</h1>
      <p className="mt-2 text-slate-300">Create and manage your software listings.</p>

      {needsProfile ? (
        <div className="mt-8 rounded-xl bg-amber-500/10 p-6 text-sm text-amber-300">
          You need a developer profile before publishing products.{' '}
          <Link href="/developer" className="font-semibold underline">
            Create one here.
          </Link>
        </div>
      ) : (
        <form onSubmit={onCreate} className="mt-8 space-y-4 rounded-xl bg-surface-muted p-6">
          <FormError message={error} />
          <Field label="Product name" type="text" value={name} onChange={setName} />
          <SubmitButton label="Create draft product" pending={pending} />
        </form>
      )}

      <div className="mt-10 space-y-3">
        {products === null && <p className="text-sm text-slate-400">Loading…</p>}
        {products?.length === 0 && !needsProfile && (
          <p className="text-sm text-slate-400">No products yet. Create your first draft above.</p>
        )}
        {products?.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="flex items-center justify-between rounded-xl bg-surface-muted p-5 transition hover:bg-white/10"
          >
            <span>
              <span className="font-semibold">{product.name}</span>
              <span className="ml-3 text-sm text-slate-400">/{product.slug}</span>
            </span>
            <span className="flex items-center gap-3 text-sm">
              <span className="text-slate-400">
                {product.latestVersion ? `v${product.latestVersion}` : 'no versions'}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[product.status]}`}
              >
                {product.status.toLowerCase()}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
