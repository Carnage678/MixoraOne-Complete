import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateProductInput,
  Product,
  ProductStatus,
  UpdateProductInput,
} from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

interface ProductRecord {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Resolves the caller's developer profile or fails. */
  async requireDeveloperProfile(userId: string) {
    const profile = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new ForbiddenException('Create a developer profile before managing products');
    }
    return profile;
  }

  /** Ownership policy: the product must belong to the caller's profile. */
  async requireOwnedProduct(productId: string, userId: string) {
    const profile = await this.requireDeveloperProfile(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.developerProfileId !== profile.id) {
      throw new ForbiddenException('You do not own this product');
    }
    return product;
  }

  async create(userId: string, input: CreateProductInput): Promise<Product> {
    const profile = await this.requireDeveloperProfile(userId);
    const base = slugify(input.name);
    if (!base) {
      throw new BadRequestException('Product name must contain letters or numbers');
    }
    const slug = await this.availableSlug(base);

    const product = await this.prisma.product.create({
      data: {
        developerProfileId: profile.id,
        slug,
        name: input.name.trim(),
        tagline: input.tagline ?? null,
        description: input.description ?? null,
        category: input.category ?? null,
      },
    });
    await this.auditLog.record({
      action: 'product.created',
      userId,
      metadata: { productId: product.id, slug },
    });
    return this.toOwnerView(product, null, 0, 0);
  }

  async update(productId: string, userId: string, input: UpdateProductInput): Promise<Product> {
    await this.requireOwnedProduct(productId, userId);
    const product = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.tagline !== undefined ? { tagline: input.tagline || null } : {}),
        ...(input.description !== undefined ? { description: input.description || null } : {}),
        ...(input.category !== undefined ? { category: input.category || null } : {}),
      },
    });
    await this.auditLog.record({ action: 'product.updated', userId, metadata: { productId } });
    return this.enrich(product);
  }

  async listOwn(userId: string): Promise<Product[]> {
    const profile = await this.requireDeveloperProfile(userId);
    const products = await this.prisma.product.findMany({
      where: { developerProfileId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(products.map((product) => this.enrich(product)));
  }

  async getOwn(productId: string, userId: string): Promise<Product> {
    const product = await this.requireOwnedProduct(productId, userId);
    return this.enrich(product);
  }

  /**
   * Publishing policy: a product needs a description, at least one version,
   * and at least one active pricing plan before it can go live.
   */
  async publish(productId: string, userId: string): Promise<Product> {
    const product = await this.requireOwnedProduct(productId, userId);
    if (product.status === 'PUBLISHED') {
      throw new BadRequestException('Product is already published');
    }

    const problems: string[] = [];
    if (!product.description || product.description.trim().length < 40) {
      problems.push('a description of at least 40 characters');
    }
    const versionCount = await this.prisma.productVersion.count({ where: { productId } });
    if (versionCount === 0) {
      problems.push('at least one released version');
    }
    const activePlans = await this.prisma.productPricingPlan.count({
      where: { productId, isActive: true },
    });
    if (activePlans === 0) {
      problems.push('at least one active pricing plan');
    }
    if (problems.length > 0) {
      throw new BadRequestException(`Cannot publish yet. Add ${problems.join(', ')}.`);
    }

    return this.transition(product, 'PUBLISHED', userId);
  }

  async archive(productId: string, userId: string): Promise<Product> {
    const product = await this.requireOwnedProduct(productId, userId);
    if (product.status === 'ARCHIVED') {
      throw new BadRequestException('Product is already archived');
    }
    return this.transition(product, 'ARCHIVED', userId);
  }

  private async transition(
    product: ProductRecord & { developerProfileId?: string },
    toStatus: ProductStatus,
    userId: string,
  ): Promise<Product> {
    const fromStatus = product.status as ProductStatus;
    const firstPublish = toStatus === 'PUBLISHED' && !product.publishedAt;

    const updated = await this.prisma.product.update({
      where: { id: product.id },
      data: {
        status: toStatus,
        ...(firstPublish ? { publishedAt: new Date() } : {}),
      },
    });
    await this.prisma.productStatusHistory.create({
      data: {
        productId: product.id,
        fromStatus,
        toStatus,
        actorUserId: userId,
      },
    });
    await this.auditLog.record({
      action: `product.${toStatus.toLowerCase()}`,
      userId,
      metadata: { productId: product.id, from: fromStatus, to: toStatus },
    });
    return this.enrich(updated);
  }

  private async availableSlug(base: string): Promise<string> {
    const existing = await this.prisma.product.findUnique({ where: { slug: base } });
    if (!existing) {
      return base;
    }
    return `${base}-${randomBytes(3).toString('hex')}`;
  }

  private async enrich(product: ProductRecord): Promise<Product> {
    const [latest, versionCount, activePlanCount] = await Promise.all([
      this.prisma.productVersion.findFirst({
        where: { productId: product.id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productVersion.count({ where: { productId: product.id } }),
      this.prisma.productPricingPlan.count({ where: { productId: product.id, isActive: true } }),
    ]);
    return this.toOwnerView(product, latest?.semver ?? null, versionCount, activePlanCount);
  }

  private toOwnerView(
    product: ProductRecord,
    latestVersion: string | null,
    versionCount: number,
    activePlanCount: number,
  ): Product {
    return {
      id: product.id,
      slug: product.slug,
      name: product.name,
      tagline: product.tagline,
      description: product.description,
      category: product.category,
      status: product.status as ProductStatus,
      publishedAt: product.publishedAt?.toISOString() ?? null,
      createdAt: product.createdAt.toISOString(),
      latestVersion,
      versionCount,
      activePlanCount,
    };
  }
}
