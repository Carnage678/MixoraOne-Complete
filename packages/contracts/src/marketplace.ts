export interface Category {
  slug: string;
  name: string;
}

/** Lightweight product card for search results and browse feeds. */
export interface ProductSummary {
  slug: string;
  name: string;
  tagline: string | null;
  categories: Category[];
  developer: {
    slug: string;
    displayName: string;
    verified: boolean;
  };
  /** Cheapest active plan in cents; null when the product has a free plan only. */
  fromPriceCents: number | null;
  currency: string;
  publishedAt: string;
}

export interface SearchResults {
  items: ProductSummary[];
  /** Pass back as ?cursor= to fetch the next page; null when exhausted. */
  nextCursor: string | null;
}

export const SEARCH_SORTS = ['newest', 'name'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export interface CreateCategoryInput {
  name: string;
}

export interface SetProductCategoriesInput {
  slugs: string[];
}
