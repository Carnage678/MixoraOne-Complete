'use client';

import type { Category, ProductSummary } from '@mixoraone/contracts';
import { FormEvent, useCallback, useEffect, useState } from 'react';

import { ProductCard } from '@/features/marketplace/product-card';
import { listCategories, searchProducts } from '@/lib/api-client/marketplace';

export default function MarketplacePage() {
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    (options: { q?: string; category?: string | null; cursor?: string; append?: boolean }) => {
      setLoading(true);
      searchProducts({
        q: options.q || undefined,
        category: options.category ?? undefined,
        cursor: options.cursor,
        limit: 12,
      })
        .then((results) => {
          setItems((previous) =>
            options.append ? [...previous, ...results.items] : results.items,
          );
          setNextCursor(results.nextCursor);
        })
        .catch(() => {
          if (!options.append) {
            setItems([]);
          }
        })
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load({});
    listCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [load]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    setActiveQuery(query);
    load({ q: query, category: activeCategory });
  }

  function onCategory(slug: string | null) {
    setActiveCategory(slug);
    load({ q: activeQuery, category: slug });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
      <p className="mt-2 text-slate-300">
        Discover software from verified developers, ready for your business.
      </p>

      <form onSubmit={onSearch} className="mt-8 flex gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search software, e.g. invoicing, support, inventory…"
          className="flex-1 rounded-lg border border-white/10 bg-surface-muted px-4 py-2.5 text-sm text-slate-100 outline-none transition focus:border-brand-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Search
        </button>
      </form>

      {categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCategory(null)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              activeCategory === null
                ? 'bg-brand-600 text-white'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => onCategory(category.slug)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                activeCategory === category.slug
                  ? 'bg-brand-600 text-white'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>

      {loading && <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">
          No products match your search yet.
        </p>
      )}
      {nextCursor && !loading && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() =>
              load({ q: activeQuery, category: activeCategory, cursor: nextCursor, append: true })
            }
            className="rounded-lg border border-white/15 px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/30"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
