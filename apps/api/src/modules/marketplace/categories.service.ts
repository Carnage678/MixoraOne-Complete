import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Category } from '@mixoraone/contracts';

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

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({ orderBy: { name: 'asc' } });
    return categories.map((category) => ({ slug: category.slug, name: category.name }));
  }

  /** Admin-managed taxonomy. */
  async create(name: string, actorUserId: string): Promise<Category> {
    const slug = slugify(name);
    if (!slug) {
      throw new BadRequestException('Category name must contain letters or numbers');
    }
    const existing = await this.prisma.category.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Category already exists');
    }
    const category = await this.prisma.category.create({ data: { slug, name: name.trim() } });
    await this.auditLog.record({
      action: 'category.created',
      userId: actorUserId,
      metadata: { slug },
    });
    return { slug: category.slug, name: category.name };
  }

  /** Replaces a product's category assignments with the given slugs. */
  async setProductCategories(productId: string, slugs: string[]): Promise<Category[]> {
    const unique = [...new Set(slugs)];
    const categories = await this.prisma.category.findMany({
      where: { slug: { in: unique } },
    });
    if (categories.length !== unique.length) {
      const known = new Set(categories.map((category) => category.slug));
      const missing = unique.filter((slug) => !known.has(slug));
      throw new BadRequestException(`Unknown categories: ${missing.join(', ')}`);
    }

    await this.prisma.productCategory.deleteMany({ where: { productId } });
    if (categories.length > 0) {
      await this.prisma.productCategory.createMany({
        data: categories.map((category) => ({ productId, categoryId: category.id })),
      });
    }
    return categories.map((category) => ({ slug: category.slug, name: category.name }));
  }
}
