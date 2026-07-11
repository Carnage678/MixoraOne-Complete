import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { CoreModule } from './core/core.module';
import { AllExceptionsFilter } from './core/http/all-exceptions.filter';
import { ApiEnvelopeInterceptor } from './core/http/api-envelope.interceptor';
import { requestIdMiddleware } from './core/http/request-id.middleware';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AiModule } from './modules/ai/ai.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DevelopersModule } from './modules/developers/developers.module';
import { HealthModule } from './modules/health/health.module';
import { MetaModule } from './modules/meta/meta.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LicensingModule } from './modules/licensing/licensing.module';
import { ProductsModule } from './modules/products/products.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    CoreModule,
    InfrastructureModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    DevelopersModule,
    ProductsModule,
    MarketplaceModule,
    AiModule,
    PaymentsModule,
    LicensingModule,
    ReviewsModule,
    AdminModule,
    AnalyticsModule,
    HealthModule,
    MetaModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ApiEnvelopeInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // NestJS 11 (path-to-regexp v8) wildcard syntax.
    consumer.apply(requestIdMiddleware).forRoutes('{*path}');
  }
}
