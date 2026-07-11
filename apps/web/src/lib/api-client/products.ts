import type {
  CreateAssetInput,
  CreateDocInput,
  CreatePricingPlanInput,
  CreateProductInput,
  CreateVersionInput,
  Product,
  ProductAsset,
  ProductDoc,
  ProductPricingPlan,
  ProductVersion,
  PublicProduct,
  UpdateProductInput,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function listOwnProducts(accessToken: string): Promise<Product[]> {
  return apiRequest<Product[]>('/products', { accessToken });
}

export function createProduct(accessToken: string, input: CreateProductInput): Promise<Product> {
  return apiRequest<Product>('/products', { method: 'POST', body: input, accessToken });
}

export function getOwnProduct(accessToken: string, id: string): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, { accessToken });
}

export function updateProduct(
  accessToken: string,
  id: string,
  input: UpdateProductInput,
): Promise<Product> {
  return apiRequest<Product>(`/products/${id}`, { method: 'PATCH', body: input, accessToken });
}

export function publishProduct(accessToken: string, id: string): Promise<Product> {
  return apiRequest<Product>(`/products/${id}/publish`, { method: 'POST', accessToken });
}

export function archiveProduct(accessToken: string, id: string): Promise<Product> {
  return apiRequest<Product>(`/products/${id}/archive`, { method: 'POST', accessToken });
}

export function listVersions(accessToken: string, id: string): Promise<ProductVersion[]> {
  return apiRequest<ProductVersion[]>(`/products/${id}/versions`, { accessToken });
}

export function addVersion(
  accessToken: string,
  id: string,
  input: CreateVersionInput,
): Promise<ProductVersion> {
  return apiRequest<ProductVersion>(`/products/${id}/versions`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function addAsset(
  accessToken: string,
  id: string,
  input: CreateAssetInput,
): Promise<ProductAsset> {
  return apiRequest<ProductAsset>(`/products/${id}/assets`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function addDoc(
  accessToken: string,
  id: string,
  input: CreateDocInput,
): Promise<ProductDoc> {
  return apiRequest<ProductDoc>(`/products/${id}/docs`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function listPricingPlans(accessToken: string, id: string): Promise<ProductPricingPlan[]> {
  return apiRequest<ProductPricingPlan[]>(`/products/${id}/pricing-plans`, { accessToken });
}

export function addPricingPlan(
  accessToken: string,
  id: string,
  input: CreatePricingPlanInput,
): Promise<ProductPricingPlan> {
  return apiRequest<ProductPricingPlan>(`/products/${id}/pricing-plans`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function fetchPublicProduct(slug: string): Promise<PublicProduct> {
  return apiRequest<PublicProduct>(`/marketplace/products/${slug}`, { cache: 'no-store' });
}
