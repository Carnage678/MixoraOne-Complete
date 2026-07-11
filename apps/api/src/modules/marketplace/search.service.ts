import { Injectable, Logger } from '@nestjs/common';
import type { SearchResults, SearchSort } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductSummaryMapper } from './product-summary.mapper';

export interface SearchParams {
  query?: string;
  category?: string;
  sort?: SearchSort;
  cursor?: string;
  limit?: number;
  userId?: string;
}

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 12;

/**
 * PostgreSQL-backed marketplace search (ILIKE over name/tagline/description,
 * category join, cursor pagination). Swappable for a dedicated search engine
 * later without changing the endpoint contract.
 */
@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryMapper: ProductSummaryMapper,
    private readonly analytics: AnalyticsService,
  ) {}

  async search(params: SearchParams): Promise<SearchResults> {
    const limit = Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const query = params.query?.trim();
    const categorySlug = params.category?.trim();

    const category = categorySlug
      ? await this.prisma.category.findUnique({ where: { slug: categorySlug } })
      : null;
    if (categorySlug && !category) {
      return { items: [], nextCursor: null };
    }

    const where = {
      status: 'PUBLISHED' as const,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { tagline: { contains: query, mode: 'insensitive' as const } },
              { description: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(category ? { productCategories: { some: { categoryId: category.id } } } : {}),
    };

    const orderBy =
      params.sort === 'name'
        ? [{ name: 'asc' as const }, { id: 'asc' as const }]
        : [{ publishedAt: 'desc' as const }, { id: 'desc' as const }];

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });

    const page = products.slice(0, limit);
    const nextCursor = products.length > limit ? page[page.length - 1].id : null;
    const items = await Promise.all(page.map((product) => this.summaryMapper.toSummary(product)));

    // Fire-and-forget analytics; a failed insert must never break search.
    if (query || categorySlug) {
      void this.prisma.searchEvent
        .create({
          data: {
            userId: params.userId ?? null,
            query: query ?? '',
            category: categorySlug ?? null,
            resultCount: items.length,
          },
        })
        .catch((error: Error) => this.logger.warn(`search event insert failed: ${error.message}`));
      void this.analytics.recordSearch(query ?? categorySlug ?? '', params.userId, items.length);
    }

    return { items, nextCursor };
  }
}
