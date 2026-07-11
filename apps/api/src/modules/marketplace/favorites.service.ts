import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ProductSummary } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ProductSummaryMapper } from './product-summary.mapper';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly summaryMapper: ProductSummaryMapper,
  ) {}

  async add(userId: string, productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'PUBLISHED') {
      throw new NotFoundException('Product not found');
    }
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (existing) {
      throw new ConflictException('Product is already saved');
    }
    await this.prisma.favorite.create({ data: { userId, productId } });
  }

  async remove(userId: string, productId: string): Promise<void> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    if (!existing) {
      throw new NotFoundException('Product is not in your saved list');
    }
    await this.prisma.favorite.delete({ where: { id: existing.id } });
  }

  async list(userId: string): Promise<ProductSummary[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: true },
    });
    const published = favorites
      .map((favorite) => favorite.product)
      .filter((product) => product.status === 'PUBLISHED');
    return Promise.all(published.map((product) => this.summaryMapper.toSummary(product)));
  }

  async slugsFor(userId: string): Promise<string[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      include: { product: true },
    });
    return favorites.map((favorite) => favorite.product.slug);
  }
}
