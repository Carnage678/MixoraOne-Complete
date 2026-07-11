import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchPublicProduct } from '@/lib/api-client/products';
import { PurchaseButton } from '@/features/marketplace/purchase-button';
import { ProductQnaSection } from '@/features/marketplace/product-qna-section';
import { ProductReviewsSection } from '@/features/marketplace/product-reviews-section';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await fetchPublicProduct(slug);
    return { title: product.name, description: product.tagline ?? undefined };
  } catch {
    return { title: 'Product' };
  }
}

function formatPrice(priceCents: number, currency: string): string {
  if (priceCents === 0) {
    return 'Free';
  }
  return `${(priceCents / 100).toFixed(2)} ${currency}`;
}

export default async function PublicProductPage({ params }: PageProps) {
  const { slug } = await params;
  let product;
  try {
    product = await fetchPublicProduct(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm text-slate-400">
        {product.category ?? 'Software'} · by{' '}
        <Link
          href={`/developers/${product.developer.slug}`}
          className="text-brand-500 hover:underline"
        >
          {product.developer.displayName}
        </Link>
        {product.developer.verified && (
          <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
            Verified developer
          </span>
        )}
      </p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">{product.name}</h1>
      {product.tagline && <p className="mt-3 text-lg text-slate-300">{product.tagline}</p>}

      <div className="mt-10 grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          {product.description && (
            <section className="rounded-xl bg-surface-muted p-6">
              <h2 className="text-lg font-semibold">About this software</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {product.description}
              </p>
            </section>
          )}

          {product.assets.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Media and resources</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {product.assets.map((asset) => (
                  <li key={asset.id}>
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-500 hover:underline"
                    >
                      {asset.title}
                    </a>
                    <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">
                      {asset.kind.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {product.docs.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Documentation</h2>
              <div className="mt-3 space-y-4">
                {product.docs.map((doc) => (
                  <details key={doc.slug} className="rounded-xl bg-surface-muted p-4">
                    <summary className="cursor-pointer text-sm font-semibold">{doc.title}</summary>
                    <p className="mt-3 whitespace-pre-line text-sm text-slate-300">{doc.content}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {product.versions.length > 0 && (
            <section className="mt-6">
              <h2 className="text-lg font-semibold">Release history</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {product.versions.map((version) => (
                  <li key={version.id} className="rounded-lg bg-surface-muted px-4 py-3">
                    <span className="font-semibold">v{version.semver}</span>
                    <span className="ml-3 text-slate-400">
                      {new Date(version.releasedAt).toLocaleDateString()}
                    </span>
                    {version.changelog && (
                      <p className="mt-1 text-slate-300">{version.changelog}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ProductReviewsSection productId={product.id} productSlug={product.slug} />
          <ProductQnaSection productId={product.id} productSlug={product.slug} />
        </div>

        <aside>
          <div className="rounded-xl bg-surface-muted p-6">
            <h2 className="text-lg font-semibold">Pricing</h2>
            <ul className="mt-4 space-y-3">
              {product.pricingPlans.map((plan) => (
                <li key={plan.id} className="rounded-lg bg-surface p-4">
                  <p className="text-sm font-semibold">{plan.name}</p>
                  <p className="mt-1 text-xl font-bold text-brand-500">
                    {formatPrice(plan.priceCents, plan.currency)}
                    {plan.interval && (
                      <span className="text-sm font-normal text-slate-400">
                        /{plan.interval.toLowerCase()}
                      </span>
                    )}
                  </p>
                  <PurchaseButton plan={plan} productSlug={product.slug} />
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
