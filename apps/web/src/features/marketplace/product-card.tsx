import type { ProductSummary } from '@mixoraone/contracts';
import Link from 'next/link';

export function formatFromPrice(product: ProductSummary): string {
  if (product.fromPriceCents === null) {
    return 'Free';
  }
  return `From ${(product.fromPriceCents / 100).toFixed(2)} ${product.currency}`;
}

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <Link
      href={`/marketplace/${product.slug}`}
      className="flex flex-col rounded-xl bg-surface-muted p-5 transition hover:bg-white/10"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{product.name}</h3>
        <span className="shrink-0 text-sm font-semibold text-brand-500">
          {formatFromPrice(product)}
        </span>
      </div>
      {product.tagline && <p className="mt-2 text-sm text-slate-300">{product.tagline}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
        <span>
          by {product.developer.displayName}
          {product.developer.verified && <span className="ml-1 text-emerald-400">(verified)</span>}
        </span>
        {product.categories.map((category) => (
          <span key={category.slug} className="rounded-full bg-white/5 px-2 py-0.5">
            {category.name}
          </span>
        ))}
      </div>
    </Link>
  );
}
