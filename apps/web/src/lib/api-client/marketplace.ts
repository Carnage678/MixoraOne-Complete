import type { Category, ProductSummary, SearchResults } from '@mixoraone/contracts';

import { apiRequest } from './http';

export interface SearchOptions {
  q?: string;
  category?: string;
  sort?: 'newest' | 'name';
  cursor?: string;
  limit?: number;
}

export function searchProducts(options: SearchOptions = {}): Promise<SearchResults> {
  const params = new URLSearchParams();
  if (options.q) params.set('q', options.q);
  if (options.category) params.set('category', options.category);
  if (options.sort) params.set('sort', options.sort);
  if (options.cursor) params.set('cursor', options.cursor);
  if (options.limit) params.set('limit', String(options.limit));
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  return apiRequest<SearchResults>(`/marketplace/search${suffix}`, { cache: 'no-store' });
}

export function listCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/marketplace/categories', { cache: 'no-store' });
}

export function listFavorites(accessToken: string): Promise<ProductSummary[]> {
  return apiRequest<ProductSummary[]>('/marketplace/favorites', { accessToken });
}

export function listFavoriteSlugs(accessToken: string): Promise<string[]> {
  return apiRequest<string[]>('/marketplace/favorites/slugs', { accessToken });
}

export function addFavorite(accessToken: string, productId: string): Promise<void> {
  return apiRequest<void>(`/marketplace/favorites/${productId}`, {
    method: 'POST',
    accessToken,
  });
}

export function removeFavorite(accessToken: string, productId: string): Promise<void> {
  return apiRequest<void>(`/marketplace/favorites/${productId}`, {
    method: 'DELETE',
    accessToken,
  });
}
