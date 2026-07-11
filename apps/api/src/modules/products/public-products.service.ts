import { Injectable, NotFoundException } from '@nestjs/common';
import type { AssetKind, BillingInterval, PricingType, PublicProduct } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';

/** Read side for the public marketplace product detail page. */
@Injectable()
export class PublicProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async getBySlug(slug: string, viewerUserId?: string): Promise<PublicProduct> {
    const product = await this.prisma.product.findUnique({ where: { slug } });
    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Product not found');
    }

    const [developer, versions, assets, docs, plans] = await Promise.all([
      this.prisma.developerProfile.findUnique({ where: { id: product.developerProfileId } }),
      this.prisma.productVersion.findMany({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productAsset.findMany({
        where: { productId: product.id },
        orderBy: { position: 'asc' },
      }),
      this.prisma.productDoc.findMany({
        where: { productId: product.id },
        orderBy: { position: 'asc' },
      }),
      this.prisma.productPricingPlan.findMany({
        where: { productId: product.id, isActive: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    if (!developer) {
      throw new NotFoundException('Product not found');
    }

    void this.analytics.recordProductView(product.id, viewerUserId);

    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      category: product.category,
      publishedAt: (product.publishedAt ?? product.createdAt).toISOString(),
      developer: {
        slug: developer.slug,
        displayName: developer.displayName,
        verified: developer.verifiedAt !== null,
      },
      versions: versions.map((version) => ({
        id: version.id,
        semver: version.semver,
        changelog: version.changelog,
        releasedAt: version.createdAt.toISOString(),
      })),
      assets: assets.map((asset) => ({
        id: asset.id,
        kind: asset.kind as AssetKind,
        title: asset.title,
        url: asset.url,
        position: asset.position,
      })),
      docs: docs.map((doc) => ({ slug: doc.slug, title: doc.title, content: doc.content })),
      pricingPlans: plans.map((plan) => ({
        id: plan.id,
        name: plan.name,
        type: plan.type as PricingType,
        priceCents: plan.priceCents,
        currency: plan.currency,
        interval: plan.interval as BillingInterval | null,
        seats: plan.seats,
        isActive: plan.isActive,
      })),
    };
  }
}
