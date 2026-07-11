export const PRODUCT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRICING_TYPES = ['FREE', 'ONE_TIME', 'SUBSCRIPTION'] as const;
export type PricingType = (typeof PRICING_TYPES)[number];

export const BILLING_INTERVALS = ['MONTH', 'YEAR'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const ASSET_KINDS = ['SCREENSHOT', 'VIDEO', 'DOCUMENT', 'LINK'] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export interface ProductVersion {
  id: string;
  semver: string;
  changelog: string | null;
  releasedAt: string;
}

export interface ProductAsset {
  id: string;
  kind: AssetKind;
  title: string;
  url: string;
  position: number;
}

export interface ProductDoc {
  id: string;
  slug: string;
  title: string;
  content: string;
  position: number;
}

export interface ProductPricingPlan {
  id: string;
  name: string;
  type: PricingType;
  priceCents: number;
  currency: string;
  interval: BillingInterval | null;
  seats: number | null;
  isActive: boolean;
}

/** Owner/management view of a product listing. */
export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  status: ProductStatus;
  publishedAt: string | null;
  createdAt: string;
  latestVersion: string | null;
  versionCount: number;
  activePlanCount: number;
}

/** Public marketplace view of a published product. */
export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  publishedAt: string;
  developer: {
    slug: string;
    displayName: string;
    verified: boolean;
  };
  versions: ProductVersion[];
  assets: ProductAsset[];
  docs: Array<Pick<ProductDoc, 'slug' | 'title' | 'content'>>;
  pricingPlans: ProductPricingPlan[];
}

export interface CreateProductInput {
  name: string;
  tagline?: string;
  description?: string;
  category?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export interface CreateVersionInput {
  semver: string;
  changelog?: string;
}

export interface CreateAssetInput {
  kind: AssetKind;
  title: string;
  url: string;
  position?: number;
}

export interface CreateDocInput {
  title: string;
  content: string;
  position?: number;
}

export interface CreatePricingPlanInput {
  name: string;
  type: PricingType;
  priceCents?: number;
  currency?: string;
  interval?: BillingInterval;
  seats?: number;
}
