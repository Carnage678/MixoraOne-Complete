export interface ProductDailyMetricRecord {
  date: string;
  views: number;
  favorites: number;
  orders: number;
  revenueCents: number;
  reviews: number;
}

export interface DeveloperProductMetric {
  productId: string;
  productName: string;
  productSlug: string;
  views: number;
  orders: number;
  revenueCents: number;
  reviews: number;
}

export interface DeveloperAnalyticsOverview {
  totalViews: number;
  totalOrders: number;
  totalRevenueCents: number;
  totalReviews: number;
  products: DeveloperProductMetric[];
  dailyMetrics: ProductDailyMetricRecord[];
}

export interface ProductAnalyticsDetail {
  productId: string;
  productName: string;
  productSlug: string;
  totals: ProductDailyMetricRecord;
  dailyMetrics: ProductDailyMetricRecord[];
}

export interface AdminAnalyticsOverview {
  totalProducts: number;
  publishedProducts: number;
  totalOrders: number;
  totalRevenueCents: number;
  totalReviews: number;
  totalUsers: number;
  totalDevelopers: number;
}

export interface MarketplaceFunnel {
  searches: number;
  productViews: number;
  orders: number;
  searchToViewRate: number;
  viewToOrderRate: number;
}
