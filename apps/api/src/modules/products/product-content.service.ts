import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  AssetKind,
  BillingInterval,
  CreateAssetInput,
  CreateDocInput,
  CreatePricingPlanInput,
  CreateVersionInput,
  PricingType,
  ProductAsset,
  ProductDoc,
  ProductPricingPlan,
  ProductVersion,
} from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProductsService } from './products.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Versions, assets, docs, and pricing plans hanging off a product. */
@Injectable()
export class ProductContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
  ) {}

  // --- Versions ---

  async addVersion(
    productId: string,
    userId: string,
    input: CreateVersionInput,
  ): Promise<ProductVersion> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const duplicate = await this.prisma.productVersion.findFirst({
      where: { productId, semver: input.semver },
    });
    if (duplicate) {
      throw new BadRequestException(`Version ${input.semver} already exists`);
    }
    const version = await this.prisma.productVersion.create({
      data: { productId, semver: input.semver, changelog: input.changelog ?? null },
    });
    return this.toVersion(version);
  }

  async listVersions(productId: string, userId: string): Promise<ProductVersion[]> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const versions = await this.prisma.productVersion.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });
    return versions.map((version) => this.toVersion(version));
  }

  // --- Assets ---

  async addAsset(
    productId: string,
    userId: string,
    input: CreateAssetInput,
  ): Promise<ProductAsset> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const asset = await this.prisma.productAsset.create({
      data: {
        productId,
        kind: input.kind,
        title: input.title.trim(),
        url: input.url,
        position: input.position ?? 0,
      },
    });
    return this.toAsset(asset);
  }

  async removeAsset(productId: string, userId: string, assetId: string): Promise<void> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const asset = await this.prisma.productAsset.findUnique({ where: { id: assetId } });
    if (!asset || asset.productId !== productId) {
      throw new NotFoundException('Asset not found');
    }
    await this.prisma.productAsset.delete({ where: { id: assetId } });
  }

  // --- Docs ---

  async addDoc(productId: string, userId: string, input: CreateDocInput): Promise<ProductDoc> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const base = slugify(input.title);
    if (!base) {
      throw new BadRequestException('Doc title must contain letters or numbers');
    }
    const duplicate = await this.prisma.productDoc.findFirst({
      where: { productId, slug: base },
    });
    const slug = duplicate ? `${base}-${Date.now().toString(36)}` : base;

    const doc = await this.prisma.productDoc.create({
      data: {
        productId,
        slug,
        title: input.title.trim(),
        content: input.content,
        position: input.position ?? 0,
      },
    });
    return this.toDoc(doc);
  }

  async updateDoc(
    productId: string,
    userId: string,
    docId: string,
    input: Partial<CreateDocInput>,
  ): Promise<ProductDoc> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const doc = await this.prisma.productDoc.findUnique({ where: { id: docId } });
    if (!doc || doc.productId !== productId) {
      throw new NotFoundException('Doc not found');
    }
    const updated = await this.prisma.productDoc.update({
      where: { id: docId },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.position !== undefined ? { position: input.position } : {}),
      },
    });
    return this.toDoc(updated);
  }

  // --- Pricing plans ---

  async addPricingPlan(
    productId: string,
    userId: string,
    input: CreatePricingPlanInput,
  ): Promise<ProductPricingPlan> {
    await this.productsService.requireOwnedProduct(productId, userId);
    if (input.type === 'SUBSCRIPTION' && !input.interval) {
      throw new BadRequestException('Subscription plans need a billing interval');
    }
    if (input.type !== 'FREE' && (input.priceCents ?? 0) <= 0) {
      throw new BadRequestException('Paid plans need a price greater than zero');
    }

    const plan = await this.prisma.productPricingPlan.create({
      data: {
        productId,
        name: input.name.trim(),
        type: input.type,
        priceCents: input.type === 'FREE' ? 0 : (input.priceCents ?? 0),
        currency: (input.currency ?? 'USD').toUpperCase(),
        interval: input.type === 'SUBSCRIPTION' ? input.interval : null,
        seats: input.seats ?? null,
      },
    });
    return this.toPlan(plan);
  }

  async setPlanActive(
    productId: string,
    userId: string,
    planId: string,
    isActive: boolean,
  ): Promise<ProductPricingPlan> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const plan = await this.prisma.productPricingPlan.findUnique({ where: { id: planId } });
    if (!plan || plan.productId !== productId) {
      throw new NotFoundException('Pricing plan not found');
    }
    const updated = await this.prisma.productPricingPlan.update({
      where: { id: planId },
      data: { isActive },
    });
    return this.toPlan(updated);
  }

  async listPricingPlans(productId: string, userId: string): Promise<ProductPricingPlan[]> {
    await this.productsService.requireOwnedProduct(productId, userId);
    const plans = await this.prisma.productPricingPlan.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });
    return plans.map((plan) => this.toPlan(plan));
  }

  // --- Mappers ---

  private toVersion(version: {
    id: string;
    semver: string;
    changelog: string | null;
    createdAt: Date;
  }): ProductVersion {
    return {
      id: version.id,
      semver: version.semver,
      changelog: version.changelog,
      releasedAt: version.createdAt.toISOString(),
    };
  }

  private toAsset(asset: {
    id: string;
    kind: string;
    title: string;
    url: string;
    position: number;
  }): ProductAsset {
    return {
      id: asset.id,
      kind: asset.kind as AssetKind,
      title: asset.title,
      url: asset.url,
      position: asset.position,
    };
  }

  private toDoc(doc: {
    id: string;
    slug: string;
    title: string;
    content: string;
    position: number;
  }): ProductDoc {
    return {
      id: doc.id,
      slug: doc.slug,
      title: doc.title,
      content: doc.content,
      position: doc.position,
    };
  }

  private toPlan(plan: {
    id: string;
    name: string;
    type: string;
    priceCents: number;
    currency: string;
    interval: string | null;
    seats: number | null;
    isActive: boolean;
  }): ProductPricingPlan {
    return {
      id: plan.id,
      name: plan.name,
      type: plan.type as PricingType,
      priceCents: plan.priceCents,
      currency: plan.currency,
      interval: plan.interval as BillingInterval | null,
      seats: plan.seats,
      isActive: plan.isActive,
    };
  }
}
