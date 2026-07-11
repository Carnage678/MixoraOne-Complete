import type {
  AdminAnalyticsOverview,
  DeveloperAnalyticsOverview,
  MarketplaceFunnel,
  ProductAnalyticsDetail,
} from '@mixoraone/contracts';

import { apiRequest } from './http';

export function fetchDeveloperOverview(accessToken: string): Promise<DeveloperAnalyticsOverview> {
  return apiRequest<DeveloperAnalyticsOverview>('/analytics/developer/overview', {
    accessToken,
    cache: 'no-store',
  });
}

export function fetchProductAnalytics(
  accessToken: string,
  productId: string,
): Promise<ProductAnalyticsDetail> {
  return apiRequest<ProductAnalyticsDetail>(`/analytics/developer/products/${productId}`, {
    accessToken,
    cache: 'no-store',
  });
}

export function fetchAdminOverview(accessToken: string): Promise<AdminAnalyticsOverview> {
  return apiRequest<AdminAnalyticsOverview>('/analytics/admin/overview', {
    accessToken,
    cache: 'no-store',
  });
}

export function fetchMarketplaceFunnel(accessToken: string): Promise<MarketplaceFunnel> {
  return apiRequest<MarketplaceFunnel>('/analytics/marketplace/funnel', {
    accessToken,
    cache: 'no-store',
  });
}
