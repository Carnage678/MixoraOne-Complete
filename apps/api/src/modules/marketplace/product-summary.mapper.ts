import { Injectable } from '@nestjs/common';
import type { ProductSummary } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';

export interface ProductRowForSummary {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  developerProfileId: string;
  publishedAt: Date | null;
  createdAt: Date;
}

/** Builds the marketplace card view shared by search, favorites, and feeds. */
@Injectable()
export class ProductSummaryMapper {
  constructor(private readonly prisma: PrismaService) {}

  async toSummary(product: ProductRowForSummary): Promise<ProductSummary> {
    const [developer, assignments, plans] = await Promise.all([
      this.prisma.developerProfile.findUnique({ where: { id: product.developerProfileId } }),
      this.prisma.productCategory.findMany({
        where: { productId: product.id },
        include: { category: true },
      }),
      this.prisma.productPricingPlan.findMany({
        where: { productId: product.id, isActive: true },
      }),
    ]);

    const paidPlans = plans.filter((plan) => plan.priceCents > 0);
    const fromPriceCents =
      paidPlans.length > 0 ? Math.min(...paidPlans.map((plan) => plan.priceCents)) : null;

    return {
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      categories: assignments.map((assignment) => ({
        slug: assignment.category.slug,
        name: assignment.category.name,
      })),
      developer: {
        slug: developer?.slug ?? 'unknown',
        displayName: developer?.displayName ?? 'Unknown developer',
        verified: developer?.verifiedAt != null,
      },
      fromPriceCents,
      currency: plans[0]?.currency ?? 'USD',
      publishedAt: (product.publishedAt ?? product.createdAt).toISOString(),
    };
  }
}
