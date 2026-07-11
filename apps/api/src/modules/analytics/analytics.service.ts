import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type {
  AdminAnalyticsOverview,
  DeveloperAnalyticsOverview,
  MarketplaceFunnel,
  ProductAnalyticsDetail,
  ProductDailyMetricRecord,
} from '@mixoraone/contracts';

import type { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';

type MetricField = 'views' | 'favorites' | 'orders' | 'revenueCents' | 'reviews';

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function metricToRecord(metric: {
  date: Date;
  views: number;
  favorites: number;
  orders: number;
  revenueCents: number;
  reviews: number;
}): ProductDailyMetricRecord {
  return {
    date: metric.date.toISOString().slice(0, 10),
    views: metric.views,
    favorites: metric.favorites,
    orders: metric.orders,
    revenueCents: metric.revenueCents,
    reviews: metric.reviews,
  };
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    name: string,
    opts: { userId?: string; productId?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          name,
          userId: opts.userId ?? null,
          productId: opts.productId ?? null,
          metadata: (opts.metadata as Prisma.InputJsonValue | undefined) ?? undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`analytics event '${name}' insert failed: ${(error as Error).message}`);
    }
  }

  async recordProductView(productId: string, userId?: string): Promise<void> {
    await this.recordEvent('product.view', { productId, userId });
    await this.incrementProductMetric(productId, 'views', 1);
  }

  async recordSearch(query: string, userId?: string, resultCount?: number): Promise<void> {
    await this.recordEvent('search.query', {
      userId,
      metadata: { query, resultCount: resultCount ?? 0 },
    });
  }

  async recordOrderPaid(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order || order.status !== 'PAID') {
      return;
    }

    for (const item of order.items) {
      await this.recordEvent('order.paid', {
        userId: order.userId,
        productId: item.productId,
        metadata: { orderId, amountCents: order.totalCents },
      });
      await this.incrementProductMetric(item.productId, 'orders', 1);
      await this.incrementProductMetric(item.productId, 'revenueCents', order.totalCents);
    }
  }

  async incrementProductMetric(
    productId: string,
    field: MetricField,
    amount: number,
  ): Promise<void> {
    const date = startOfUtcDay(new Date());
    try {
      await this.prisma.productDailyMetric.upsert({
        where: { productId_date: { productId, date } },
        create: {
          productId,
          date,
          views: field === 'views' ? amount : 0,
          favorites: field === 'favorites' ? amount : 0,
          orders: field === 'orders' ? amount : 0,
          revenueCents: field === 'revenueCents' ? amount : 0,
          reviews: field === 'reviews' ? amount : 0,
        },
        update: { [field]: { increment: amount } },
      });
    } catch (error) {
      this.logger.warn(
        `product metric '${field}' upsert failed for ${productId}: ${(error as Error).message}`,
      );
    }
  }

  async getDeveloperOverview(userId: string): Promise<DeveloperAnalyticsOverview> {
    const profile = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException('Developer profile required');
    }

    const products = await this.prisma.product.findMany({
      where: { developerProfileId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
    const productIds = products.map((product) => product.id);

    const metrics = productIds.length
      ? await this.prisma.productDailyMetric.findMany({
          where: { productId: { in: productIds } },
          orderBy: { date: 'desc' },
          take: 30,
        })
      : [];

    const productMetrics = await Promise.all(
      products.map(async (product) => {
        const totals = await this.prisma.productDailyMetric.aggregate({
          where: { productId: product.id },
          _sum: {
            views: true,
            orders: true,
            revenueCents: true,
            reviews: true,
          },
        });
        return {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          views: totals._sum.views ?? 0,
          orders: totals._sum.orders ?? 0,
          revenueCents: totals._sum.revenueCents ?? 0,
          reviews: totals._sum.reviews ?? 0,
        };
      }),
    );

    const dailyByDate = new Map<string, ProductDailyMetricRecord>();
    for (const metric of metrics) {
      const key = metric.date.toISOString().slice(0, 10);
      const existing = dailyByDate.get(key) ?? {
        date: key,
        views: 0,
        favorites: 0,
        orders: 0,
        revenueCents: 0,
        reviews: 0,
      };
      existing.views += metric.views;
      existing.favorites += metric.favorites;
      existing.orders += metric.orders;
      existing.revenueCents += metric.revenueCents;
      existing.reviews += metric.reviews;
      dailyByDate.set(key, existing);
    }

    return {
      totalViews: productMetrics.reduce((sum, entry) => sum + entry.views, 0),
      totalOrders: productMetrics.reduce((sum, entry) => sum + entry.orders, 0),
      totalRevenueCents: productMetrics.reduce((sum, entry) => sum + entry.revenueCents, 0),
      totalReviews: productMetrics.reduce((sum, entry) => sum + entry.reviews, 0),
      products: productMetrics,
      dailyMetrics: [...dailyByDate.values()].sort((a, b) => b.date.localeCompare(a.date)),
    };
  }

  async getProductDetail(userId: string, productId: string): Promise<ProductAnalyticsDetail> {
    const profile = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException('Developer profile required');
    }

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.developerProfileId !== profile.id) {
      throw new NotFoundException('Product not found');
    }

    const [totals, dailyMetrics] = await Promise.all([
      this.prisma.productDailyMetric.aggregate({
        where: { productId },
        _sum: {
          views: true,
          favorites: true,
          orders: true,
          revenueCents: true,
          reviews: true,
        },
      }),
      this.prisma.productDailyMetric.findMany({
        where: { productId },
        orderBy: { date: 'desc' },
        take: 30,
      }),
    ]);

    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      totals: {
        date: 'all',
        views: totals._sum.views ?? 0,
        favorites: totals._sum.favorites ?? 0,
        orders: totals._sum.orders ?? 0,
        revenueCents: totals._sum.revenueCents ?? 0,
        reviews: totals._sum.reviews ?? 0,
      },
      dailyMetrics: dailyMetrics.map(metricToRecord),
    };
  }

  async getAdminOverview(): Promise<AdminAnalyticsOverview> {
    const [
      totalProducts,
      publishedProducts,
      totalOrders,
      paidRevenue,
      totalReviews,
      totalUsers,
      totalDevelopers,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.product.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.order.count({ where: { status: 'PAID' } }),
      this.prisma.order.aggregate({
        where: { status: 'PAID' },
        _sum: { totalCents: true },
      }),
      this.prisma.review.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.user.count(),
      this.prisma.developerProfile.count(),
    ]);

    return {
      totalProducts,
      publishedProducts,
      totalOrders,
      totalRevenueCents: paidRevenue._sum.totalCents ?? 0,
      totalReviews,
      totalUsers,
      totalDevelopers,
    };
  }

  async getMarketplaceFunnel(): Promise<MarketplaceFunnel> {
    const [searches, productViews, orders] = await Promise.all([
      this.prisma.searchEvent.count(),
      this.prisma.analyticsEvent.count({ where: { name: 'product.view' } }),
      this.prisma.analyticsEvent.count({ where: { name: 'order.paid' } }),
    ]);

    const searchToViewRate = searches > 0 ? productViews / searches : 0;
    const viewToOrderRate = productViews > 0 ? orders / productViews : 0;

    return {
      searches,
      productViews,
      orders,
      searchToViewRate: Math.round(searchToViewRate * 1000) / 1000,
      viewToOrderRate: Math.round(viewToOrderRate * 1000) / 1000,
    };
  }
}
