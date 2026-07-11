import { randomUUID } from 'node:crypto';

/**
 * Minimal in-memory stand-in for PrismaService covering exactly the model
 * operations the auth module uses. Lets the e2e suite exercise real HTTP
 * flows (register, login, refresh rotation, reuse detection, RBAC) without
 * a PostgreSQL instance, which keeps CI hermetic.
 */

interface UserRow {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  role: 'USER' | 'DEVELOPER' | 'ADMIN';
  emailVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface RefreshTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

interface EmailVerificationTokenRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

interface AuditLogRow {
  id: string;
  userId: string | null;
  action: string;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

interface OrganizationMemberRow {
  id: string;
  organizationId: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  createdAt: Date;
}

interface DeveloperProfileRow {
  id: string;
  userId: string;
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  skills: string[];
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DeveloperVerificationRow {
  id: string;
  profileId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  legalName: string;
  country: string;
  websiteUrl: string | null;
  evidenceUrl: string | null;
  note: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  createdAt: Date;
}

interface ProductRow {
  id: string;
  developerProfileId: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductVersionRow {
  id: string;
  productId: string;
  semver: string;
  changelog: string | null;
  createdAt: Date;
}

interface ProductAssetRow {
  id: string;
  productId: string;
  kind: 'SCREENSHOT' | 'VIDEO' | 'DOCUMENT' | 'LINK';
  title: string;
  url: string;
  position: number;
  createdAt: Date;
}

interface ProductDocRow {
  id: string;
  productId: string;
  slug: string;
  title: string;
  content: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductPricingPlanRow {
  id: string;
  productId: string;
  name: string;
  type: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
  priceCents: number;
  currency: string;
  interval: 'MONTH' | 'YEAR' | null;
  seats: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductStatusHistoryRow {
  id: string;
  productId: string;
  fromStatus: string;
  toStatus: string;
  actorUserId: string | null;
  note: string | null;
  createdAt: Date;
}

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
}

interface ProductCategoryRow {
  id: string;
  productId: string;
  categoryId: string;
}

interface FavoriteRow {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

interface SearchEventRow {
  id: string;
  userId: string | null;
  query: string;
  category: string | null;
  resultCount: number;
  createdAt: Date;
}

interface AiConversationRow {
  id: string;
  userId: string;
  kind: 'REQUIREMENT' | 'DEVELOPER_ASSISTANT';
  productId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AiMessageRow {
  id: string;
  conversationId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Date;
}

interface AiRecommendationRow {
  id: string;
  conversationId: string;
  productId: string;
  reason: string;
  createdAt: Date;
}

interface ProductContentSuggestionRow {
  id: string;
  productId: string;
  conversationId: string | null;
  field: 'TAGLINE' | 'DESCRIPTION' | 'CATEGORY' | 'CHANGELOG' | 'DOC';
  currentValue: string | null;
  suggestedValue: string;
  reason: string;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  createdAt: Date;
}

interface OrderRow {
  id: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  totalCents: number;
  currency: string;
  idempotencyKey: string | null;
  provider: string | null;
  providerSessionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItemRow {
  id: string;
  orderId: string;
  productId: string;
  pricingPlanId: string;
  productName: string;
  planName: string;
  pricingType: 'FREE' | 'ONE_TIME' | 'SUBSCRIPTION';
  quantity: number;
  unitPriceCents: number;
  currency: string;
  createdAt: Date;
}

interface PaymentRow {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  amountCents: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentWebhookEventRow {
  id: string;
  provider: string;
  eventId: string;
  payload: unknown;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
  processedAt: Date | null;
  error: string | null;
  createdAt: Date;
}

interface SubscriptionRow {
  id: string;
  userId: string;
  productId: string;
  pricingPlanId: string;
  orderId: string | null;
  provider: string;
  providerSubscriptionId: string | null;
  status: 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'INCOMPLETE';
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceRow {
  id: string;
  userId: string;
  orderId: string | null;
  subscriptionId: string | null;
  number: string;
  amountCents: number;
  currency: string;
  status: 'DRAFT' | 'OPEN' | 'PAID' | 'VOID';
  issuedAt: Date;
  paidAt: Date | null;
  createdAt: Date;
}

interface LicenseRow {
  id: string;
  userId: string;
  productId: string;
  pricingPlanId: string;
  orderId: string;
  subscriptionId: string | null;
  licenseKeyHash: string;
  keyHint: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
  seatLimit: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LicenseSeatRow {
  id: string;
  licenseId: string;
  assignedUserId: string | null;
  assignedEmail: string | null;
  assignedAt: Date | null;
  createdAt: Date;
}

interface LicenseActivationRow {
  id: string;
  licenseId: string;
  seatId: string | null;
  userId: string;
  deviceId: string;
  deviceName: string | null;
  activationTokenHash: string;
  lastSeenAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface ReviewRow {
  id: string;
  productId: string;
  userId: string;
  orderId: string | null;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  status: 'PUBLISHED' | 'HIDDEN' | 'REMOVED';
  createdAt: Date;
  updatedAt: Date;
}

interface ReviewReplyRow {
  id: string;
  reviewId: string;
  developerProfileId: string;
  body: string;
  createdAt: Date;
}

interface QuestionRow {
  id: string;
  productId: string;
  userId: string;
  title: string;
  body: string;
  createdAt: Date;
}

interface AnswerRow {
  id: string;
  questionId: string;
  userId: string;
  body: string;
  createdAt: Date;
}

interface FeedbackRow {
  id: string;
  userId: string;
  productId: string | null;
  subject: string;
  body: string;
  createdAt: Date;
}

interface ReportRow {
  id: string;
  reporterUserId: string;
  targetType: 'REVIEW' | 'QUESTION' | 'PRODUCT' | 'USER';
  targetId: string;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'REVIEWED' | 'DISMISSED';
  createdAt: Date;
  updatedAt: Date;
}

interface TrustCheckRow {
  id: string;
  kind: 'DEVELOPER' | 'PRODUCT' | 'DOMAIN' | 'COMPLIANCE';
  subjectType: string;
  subjectId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  evidence: string | null;
  decidedByUserId: string | null;
  decisionNote: string | null;
  createdAt: Date;
  decidedAt: Date | null;
}

interface ModerationCaseRow {
  id: string;
  reportId: string | null;
  subjectType: string;
  subjectId: string;
  status: 'OPEN' | 'RESOLVED';
  decision: 'APPROVE' | 'REMOVE' | 'WARN' | null;
  decidedByUserId: string | null;
  decisionNote: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

interface DisputeRow {
  id: string;
  orderId: string | null;
  reporterUserId: string;
  respondentUserId: string | null;
  reason: string;
  status: 'OPEN' | 'RESOLVED';
  resolution: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

interface AnalyticsEventRow {
  id: string;
  name: string;
  userId: string | null;
  productId: string | null;
  metadata: unknown;
  createdAt: Date;
}

interface ProductDailyMetricRow {
  id: string;
  productId: string;
  date: Date;
  views: number;
  favorites: number;
  orders: number;
  revenueCents: number;
  reviews: number;
}

/** Subset of Prisma product where-filters used by the search service. */
interface ProductWhere {
  developerProfileId?: string;
  status?: string;
  OR?: Array<{
    name?: { contains: string; mode?: string };
    tagline?: { contains: string; mode?: string };
    description?: { contains: string; mode?: string };
  }>;
  productCategories?: { some: { categoryId: string } };
}

export class PrismaFake {
  users: UserRow[] = [];
  refreshTokens: RefreshTokenRow[] = [];
  emailVerificationTokens: EmailVerificationTokenRow[] = [];
  auditLogs: AuditLogRow[] = [];
  organizations: OrganizationRow[] = [];
  organizationMembers: OrganizationMemberRow[] = [];
  developerProfiles: DeveloperProfileRow[] = [];
  developerVerifications: DeveloperVerificationRow[] = [];
  products: ProductRow[] = [];
  productVersions: ProductVersionRow[] = [];
  productAssets: ProductAssetRow[] = [];
  productDocs: ProductDocRow[] = [];
  productPricingPlans: ProductPricingPlanRow[] = [];
  productStatusHistories: ProductStatusHistoryRow[] = [];
  categories: CategoryRow[] = [];
  productCategories: ProductCategoryRow[] = [];
  favorites: FavoriteRow[] = [];
  searchEvents: SearchEventRow[] = [];
  aiConversations: AiConversationRow[] = [];
  aiMessages: AiMessageRow[] = [];
  aiRecommendations: AiRecommendationRow[] = [];
  productContentSuggestions: ProductContentSuggestionRow[] = [];
  orders: OrderRow[] = [];
  orderItems: OrderItemRow[] = [];
  payments: PaymentRow[] = [];
  paymentWebhookEvents: PaymentWebhookEventRow[] = [];
  subscriptions: SubscriptionRow[] = [];
  invoices: InvoiceRow[] = [];
  licenses: LicenseRow[] = [];
  licenseSeats: LicenseSeatRow[] = [];
  licenseActivations: LicenseActivationRow[] = [];
  reviews: ReviewRow[] = [];
  reviewReplies: ReviewReplyRow[] = [];
  questions: QuestionRow[] = [];
  answers: AnswerRow[] = [];
  feedbackRows: FeedbackRow[] = [];
  reports: ReportRow[] = [];
  trustChecks: TrustCheckRow[] = [];
  moderationCases: ModerationCaseRow[] = [];
  disputes: DisputeRow[] = [];
  analyticsEvents: AnalyticsEventRow[] = [];
  productDailyMetrics: ProductDailyMetricRow[] = [];

  readonly user = {
    findUnique: async ({ where }: { where: { id?: string; email?: string } }) =>
      this.users.find(
        (row) =>
          (where.id !== undefined && row.id === where.id) ||
          (where.email !== undefined && row.email === where.email),
      ) ?? null,
    create: async ({
      data,
    }: {
      data: Partial<UserRow> & {
        email: string;
        name: string;
        accounts?: { create: { provider: string; providerAccountId: string } };
      };
    }) => {
      const row: UserRow = {
        id: randomUUID(),
        email: data.email,
        passwordHash: data.passwordHash ?? null,
        name: data.name,
        role: data.role ?? 'USER',
        emailVerifiedAt: data.emailVerifiedAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<UserRow> }) => {
      const row = this.users.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('User not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    count: async () => this.users.length,
  };

  readonly refreshToken = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { tokenHash?: string; id?: string };
      include?: { user?: boolean };
    }) => {
      const row =
        this.refreshTokens.find(
          (entry) =>
            (where.tokenHash !== undefined && entry.tokenHash === where.tokenHash) ||
            (where.id !== undefined && entry.id === where.id),
        ) ?? null;
      if (!row) {
        return null;
      }
      if (include?.user) {
        const user = this.users.find((entry) => entry.id === row.userId);
        return { ...row, user };
      }
      return { ...row };
    },
    create: async ({
      data,
    }: {
      data: Omit<RefreshTokenRow, 'id' | 'createdAt' | 'revokedAt'> & { revokedAt?: Date | null };
    }) => {
      const row: RefreshTokenRow = {
        id: randomUUID(),
        revokedAt: null,
        createdAt: new Date(),
        ...data,
      };
      this.refreshTokens.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<RefreshTokenRow> }) => {
      const row = this.refreshTokens.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Refresh token not found');
      }
      Object.assign(row, data);
      return row;
    },
    updateMany: async ({
      where,
      data,
    }: {
      where: { familyId: string; revokedAt: null };
      data: Partial<RefreshTokenRow>;
    }) => {
      const rows = this.refreshTokens.filter(
        (entry) => entry.familyId === where.familyId && entry.revokedAt === null,
      );
      rows.forEach((row) => Object.assign(row, data));
      return { count: rows.length };
    },
  };

  readonly emailVerificationToken = {
    findUnique: async ({ where }: { where: { tokenHash: string } }) =>
      this.emailVerificationTokens.find((entry) => entry.tokenHash === where.tokenHash) ?? null,
    create: async ({
      data,
    }: {
      data: Omit<EmailVerificationTokenRow, 'id' | 'createdAt' | 'usedAt'>;
    }) => {
      const row: EmailVerificationTokenRow = {
        id: randomUUID(),
        usedAt: null,
        createdAt: new Date(),
        ...data,
      };
      this.emailVerificationTokens.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<EmailVerificationTokenRow>;
    }) => {
      const row = this.emailVerificationTokens.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Verification token not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly auditLog = {
    create: async ({ data }: { data: Omit<AuditLogRow, 'id' | 'createdAt'> }) => {
      const row: AuditLogRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.auditLogs.push(row);
      return row;
    },
    findMany: async ({ take }: { orderBy?: unknown; take?: number }) =>
      [...this.auditLogs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, take ?? 50),
  };

  readonly organization = {
    findUnique: async ({ where }: { where: { id?: string; slug?: string } }) =>
      this.organizations.find(
        (row) =>
          (where.id !== undefined && row.id === where.id) ||
          (where.slug !== undefined && row.slug === where.slug),
      ) ?? null,
    create: async ({
      data,
    }: {
      data: {
        name: string;
        slug: string;
        members?: { create: { userId: string; role: 'OWNER' | 'MEMBER' } };
      };
    }) => {
      const row: OrganizationRow = {
        id: randomUUID(),
        name: data.name,
        slug: data.slug,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.organizations.push(row);
      if (data.members?.create) {
        this.organizationMembers.push({
          id: randomUUID(),
          organizationId: row.id,
          userId: data.members.create.userId,
          role: data.members.create.role ?? 'MEMBER',
          createdAt: new Date(),
        });
      }
      return row;
    },
  };

  readonly organizationMember = {
    findUnique: async ({
      where,
    }: {
      where: {
        id?: string;
        organizationId_userId?: { organizationId: string; userId: string };
      };
    }) => {
      if (where.organizationId_userId) {
        const { organizationId, userId } = where.organizationId_userId;
        return (
          this.organizationMembers.find(
            (row) => row.organizationId === organizationId && row.userId === userId,
          ) ?? null
        );
      }
      return this.organizationMembers.find((row) => row.id === where.id) ?? null;
    },
    findFirst: async ({
      where,
    }: {
      where: { organizationId: string; role: 'OWNER' | 'MEMBER'; userId?: { not: string } };
    }) =>
      this.organizationMembers.find(
        (row) =>
          row.organizationId === where.organizationId &&
          row.role === where.role &&
          (where.userId?.not === undefined || row.userId !== where.userId.not),
      ) ?? null,
    findMany: async ({
      where,
      include,
    }: {
      where: { userId?: string; organizationId?: string };
      include?: {
        organization?: { include?: { _count?: { select: { members: boolean } } } };
        user?: boolean;
      };
      orderBy?: unknown;
    }) => {
      const rows = this.organizationMembers
        .filter(
          (row) =>
            (where.userId === undefined || row.userId === where.userId) &&
            (where.organizationId === undefined || row.organizationId === where.organizationId),
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      return rows.map((row) => {
        const enriched: Record<string, unknown> = { ...row };
        if (include?.organization) {
          const organization = this.organizations.find((entry) => entry.id === row.organizationId)!;
          enriched.organization = {
            ...organization,
            _count: {
              members: this.organizationMembers.filter(
                (entry) => entry.organizationId === row.organizationId,
              ).length,
            },
          };
        }
        if (include?.user) {
          enriched.user = this.users.find((entry) => entry.id === row.userId);
        }
        return enriched;
      });
    },
    create: async ({
      data,
    }: {
      data: { organizationId: string; userId: string; role: 'OWNER' | 'MEMBER' };
    }) => {
      const row: OrganizationMemberRow = {
        id: randomUUID(),
        createdAt: new Date(),
        ...data,
      };
      this.organizationMembers.push(row);
      return row;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.organizationMembers.findIndex((row) => row.id === where.id);
      if (index === -1) {
        throw new Error('Membership not found');
      }
      const [removed] = this.organizationMembers.splice(index, 1);
      return removed;
    },
  };

  readonly developerProfile = {
    findUnique: async ({ where }: { where: { id?: string; userId?: string; slug?: string } }) =>
      this.developerProfiles.find(
        (row) =>
          (where.id !== undefined && row.id === where.id) ||
          (where.userId !== undefined && row.userId === where.userId) ||
          (where.slug !== undefined && row.slug === where.slug),
      ) ?? null,
    create: async ({
      data,
    }: {
      data: Omit<DeveloperProfileRow, 'id' | 'createdAt' | 'updatedAt' | 'verifiedAt'> & {
        verifiedAt?: Date | null;
      };
    }) => {
      const row: DeveloperProfileRow = {
        id: randomUUID(),
        verifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.developerProfiles.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<DeveloperProfileRow>;
    }) => {
      const row = this.developerProfiles.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Developer profile not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    count: async () => this.developerProfiles.length,
  };

  readonly developerVerification = {
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: { profileId: string; status?: 'PENDING' | 'APPROVED' | 'REJECTED' };
      orderBy?: { createdAt: 'desc' | 'asc' };
    }) => {
      const rows = this.developerVerifications
        .filter(
          (row) =>
            row.profileId === where.profileId &&
            (where.status === undefined || row.status === where.status),
        )
        .sort((a, b) =>
          orderBy?.createdAt === 'desc'
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime(),
        );
      return rows[0] ?? null;
    },
    create: async ({
      data,
    }: {
      data: Omit<
        DeveloperVerificationRow,
        'id' | 'createdAt' | 'status' | 'decidedAt' | 'decisionNote'
      >;
    }) => {
      const row: DeveloperVerificationRow = {
        id: randomUUID(),
        status: 'PENDING',
        decidedAt: null,
        decisionNote: null,
        createdAt: new Date(),
        ...data,
      };
      this.developerVerifications.push(row);
      return row;
    },
  };

  readonly product = {
    findUnique: async ({ where }: { where: { id?: string; slug?: string } }) =>
      this.products.find(
        (row) =>
          (where.id !== undefined && row.id === where.id) ||
          (where.slug !== undefined && row.slug === where.slug),
      ) ?? null,
    findMany: async ({
      where,
      orderBy,
      take,
      cursor,
      skip,
    }: {
      where: ProductWhere;
      orderBy?: Array<Record<string, 'asc' | 'desc'>> | Record<string, 'asc' | 'desc'>;
      take?: number;
      cursor?: { id: string };
      skip?: number;
    }) => {
      const matchesText = (row: ProductRow) => {
        if (!where.OR) {
          return true;
        }
        return where.OR.some((clause) => {
          const [field, condition] = Object.entries(clause)[0] as [
            'name' | 'tagline' | 'description',
            { contains: string },
          ];
          const value = row[field];
          return value !== null && value.toLowerCase().includes(condition.contains.toLowerCase());
        });
      };
      const matchesCategory = (row: ProductRow) => {
        if (!where.productCategories) {
          return true;
        }
        const wanted = where.productCategories.some.categoryId;
        return this.productCategories.some(
          (entry) => entry.productId === row.id && entry.categoryId === wanted,
        );
      };

      let rows = this.products.filter(
        (row) =>
          (where.developerProfileId === undefined ||
            row.developerProfileId === where.developerProfileId) &&
          (where.status === undefined || row.status === where.status) &&
          matchesText(row) &&
          matchesCategory(row),
      );

      const orderings = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
      rows = [...rows].sort((a, b) => {
        for (const ordering of orderings) {
          const [field, direction] = Object.entries(ordering)[0] as [
            keyof ProductRow,
            'asc' | 'desc',
          ];
          const left = a[field];
          const right = b[field];
          let compared = 0;
          if (left instanceof Date && right instanceof Date) {
            compared = left.getTime() - right.getTime();
          } else if (typeof left === 'string' && typeof right === 'string') {
            compared = left.localeCompare(right);
          }
          if (compared !== 0) {
            return direction === 'desc' ? -compared : compared;
          }
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      if (cursor) {
        const index = rows.findIndex((row) => row.id === cursor.id);
        rows = index === -1 ? [] : rows.slice(index + (skip ?? 0));
      }
      if (take !== undefined) {
        rows = rows.slice(0, take);
      }
      return rows;
    },
    create: async ({
      data,
    }: {
      data: Omit<ProductRow, 'id' | 'status' | 'publishedAt' | 'createdAt' | 'updatedAt'>;
    }) => {
      const row: ProductRow = {
        id: randomUUID(),
        status: 'DRAFT',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.products.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<ProductRow> }) => {
      const row = this.products.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Product not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    count: async ({ where }: { where?: { status?: string } } = {}) =>
      this.products.filter((row) => where?.status === undefined || row.status === where.status)
        .length,
  };

  readonly productVersion = {
    findFirst: async ({
      where,
      orderBy,
    }: {
      where: { productId: string; semver?: string };
      orderBy?: { createdAt: 'desc' | 'asc' };
    }) => {
      const rows = this.productVersions
        .filter(
          (row) =>
            row.productId === where.productId &&
            (where.semver === undefined || row.semver === where.semver),
        )
        .sort((a, b) =>
          orderBy?.createdAt === 'desc'
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime(),
        );
      return rows[0] ?? null;
    },
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where: { productId: string };
      orderBy?: { createdAt: 'desc' | 'asc' };
      take?: number;
    }) => {
      let rows = this.productVersions
        .filter((row) => row.productId === where.productId)
        .sort((a, b) =>
          orderBy?.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
      if (take !== undefined) {
        rows = rows.slice(0, take);
      }
      return rows;
    },
    count: async ({ where }: { where: { productId: string } }) =>
      this.productVersions.filter((row) => row.productId === where.productId).length,
    create: async ({ data }: { data: Omit<ProductVersionRow, 'id' | 'createdAt'> }) => {
      const row: ProductVersionRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.productVersions.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<ProductVersionRow> }) => {
      const row = this.productVersions.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Version not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly productAsset = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.productAssets.find((row) => row.id === where.id) ?? null,
    findMany: async ({ where }: { where: { productId: string }; orderBy?: unknown }) =>
      this.productAssets
        .filter((row) => row.productId === where.productId)
        .sort((a, b) => a.position - b.position),
    count: async ({ where }: { where: { productId: string } }) =>
      this.productAssets.filter((row) => row.productId === where.productId).length,
    create: async ({ data }: { data: Omit<ProductAssetRow, 'id' | 'createdAt'> }) => {
      const row: ProductAssetRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.productAssets.push(row);
      return row;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.productAssets.findIndex((row) => row.id === where.id);
      if (index === -1) {
        throw new Error('Asset not found');
      }
      const [removed] = this.productAssets.splice(index, 1);
      return removed;
    },
  };

  readonly productDoc = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.productDocs.find((row) => row.id === where.id) ?? null,
    findFirst: async ({ where }: { where: { productId: string; slug: string } }) =>
      this.productDocs.find(
        (row) => row.productId === where.productId && row.slug === where.slug,
      ) ?? null,
    findMany: async ({
      where,
      take,
    }: {
      where: { productId: string };
      orderBy?: unknown;
      take?: number;
    }) => {
      let rows = this.productDocs
        .filter((row) => row.productId === where.productId)
        .sort((a, b) => a.position - b.position);
      if (take !== undefined) {
        rows = rows.slice(0, take);
      }
      return rows;
    },
    create: async ({ data }: { data: Omit<ProductDocRow, 'id' | 'createdAt' | 'updatedAt'> }) => {
      const row: ProductDocRow = {
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.productDocs.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<ProductDocRow> }) => {
      const row = this.productDocs.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Doc not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
  };

  readonly productPricingPlan = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { product?: boolean };
    }) => {
      const row = this.productPricingPlans.find((entry) => entry.id === where.id) ?? null;
      if (!row) {
        return null;
      }
      if (include?.product) {
        const product = this.products.find((entry) => entry.id === row.productId);
        return product ? { ...row, product } : null;
      }
      return row;
    },
    findMany: async ({
      where,
    }: {
      where: { productId: string; isActive?: boolean };
      orderBy?: unknown;
    }) =>
      this.productPricingPlans
        .filter(
          (row) =>
            row.productId === where.productId &&
            (where.isActive === undefined || row.isActive === where.isActive),
        )
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    count: async ({ where }: { where: { productId: string; isActive?: boolean } }) =>
      this.productPricingPlans.filter(
        (row) =>
          row.productId === where.productId &&
          (where.isActive === undefined || row.isActive === where.isActive),
      ).length,
    create: async ({
      data,
    }: {
      data: Omit<ProductPricingPlanRow, 'id' | 'isActive' | 'createdAt' | 'updatedAt'> & {
        isActive?: boolean;
      };
    }) => {
      const row: ProductPricingPlanRow = {
        id: randomUUID(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.productPricingPlans.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<ProductPricingPlanRow>;
    }) => {
      const row = this.productPricingPlans.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Plan not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
  };

  readonly productStatusHistory = {
    create: async ({ data }: { data: Omit<ProductStatusHistoryRow, 'id' | 'createdAt'> }) => {
      const row: ProductStatusHistoryRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.productStatusHistories.push(row);
      return row;
    },
    findMany: async ({ where }: { where: { productId: string }; orderBy?: unknown }) =>
      this.productStatusHistories
        .filter((row) => row.productId === where.productId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
  };

  readonly category = {
    findUnique: async ({ where }: { where: { id?: string; slug?: string } }) =>
      this.categories.find(
        (row) =>
          (where.id !== undefined && row.id === where.id) ||
          (where.slug !== undefined && row.slug === where.slug),
      ) ?? null,
    findMany: async (args?: { where?: { slug?: { in: string[] } }; orderBy?: unknown }) => {
      const rows = this.categories.filter(
        (row) => args?.where?.slug === undefined || args.where.slug.in.includes(row.slug),
      );
      return [...rows].sort((a, b) => a.name.localeCompare(b.name));
    },
    create: async ({ data }: { data: { slug: string; name: string } }) => {
      const row: CategoryRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.categories.push(row);
      return row;
    },
  };

  readonly productCategory = {
    findMany: async ({
      where,
      include,
    }: {
      where: { productId?: string; categoryId?: string };
      include?: { category?: boolean };
    }) => {
      const rows = this.productCategories.filter(
        (row) =>
          (where.productId === undefined || row.productId === where.productId) &&
          (where.categoryId === undefined || row.categoryId === where.categoryId),
      );
      return rows.map((row) =>
        include?.category
          ? { ...row, category: this.categories.find((entry) => entry.id === row.categoryId)! }
          : { ...row },
      );
    },
    createMany: async ({ data }: { data: Array<{ productId: string; categoryId: string }> }) => {
      data.forEach((entry) => {
        this.productCategories.push({ id: randomUUID(), ...entry });
      });
      return { count: data.length };
    },
    deleteMany: async ({ where }: { where: { productId: string } }) => {
      const before = this.productCategories.length;
      this.productCategories = this.productCategories.filter(
        (row) => row.productId !== where.productId,
      );
      return { count: before - this.productCategories.length };
    },
  };

  readonly favorite = {
    findUnique: async ({
      where,
    }: {
      where: { userId_productId?: { userId: string; productId: string }; id?: string };
    }) => {
      if (where.userId_productId) {
        const { userId, productId } = where.userId_productId;
        return (
          this.favorites.find((row) => row.userId === userId && row.productId === productId) ?? null
        );
      }
      return this.favorites.find((row) => row.id === where.id) ?? null;
    },
    findMany: async ({
      where,
      include,
    }: {
      where: { userId: string };
      include?: { product?: boolean };
      orderBy?: unknown;
    }) => {
      const rows = this.favorites
        .filter((row) => row.userId === where.userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return rows.map((row) =>
        include?.product
          ? { ...row, product: this.products.find((entry) => entry.id === row.productId)! }
          : { ...row },
      );
    },
    create: async ({ data }: { data: { userId: string; productId: string } }) => {
      const row: FavoriteRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.favorites.push(row);
      return row;
    },
    delete: async ({ where }: { where: { id: string } }) => {
      const index = this.favorites.findIndex((row) => row.id === where.id);
      if (index === -1) {
        throw new Error('Favorite not found');
      }
      const [removed] = this.favorites.splice(index, 1);
      return removed;
    },
  };

  readonly searchEvent = {
    create: async ({ data }: { data: Omit<SearchEventRow, 'id' | 'createdAt'> }) => {
      const row: SearchEventRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.searchEvents.push(row);
      return row;
    },
    count: async () => this.searchEvents.length,
  };

  readonly aiConversation = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.aiConversations.find((row) => row.id === where.id) ?? null,
    findMany: async ({
      where,
    }: {
      where: { userId: string; kind?: string; productId?: string };
      orderBy?: unknown;
    }) =>
      this.aiConversations
        .filter(
          (row) =>
            row.userId === where.userId &&
            (where.kind === undefined || row.kind === where.kind) &&
            (where.productId === undefined || row.productId === where.productId),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    create: async ({
      data,
    }: {
      data: {
        userId: string;
        kind: 'REQUIREMENT' | 'DEVELOPER_ASSISTANT';
        productId?: string | null;
        title?: string | null;
      };
    }) => {
      const row: AiConversationRow = {
        id: randomUUID(),
        title: data.title ?? null,
        productId: data.productId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: data.userId,
        kind: data.kind,
      };
      this.aiConversations.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<AiConversationRow>;
    }) => {
      const row = this.aiConversations.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Conversation not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
  };

  readonly aiMessage = {
    findMany: async ({ where }: { where: { conversationId: string }; orderBy?: unknown }) =>
      this.aiMessages
        .filter((row) => row.conversationId === where.conversationId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    create: async ({
      data,
    }: {
      data: Omit<
        AiMessageRow,
        'id' | 'createdAt' | 'provider' | 'model' | 'inputTokens' | 'outputTokens'
      > &
        Partial<Pick<AiMessageRow, 'provider' | 'model' | 'inputTokens' | 'outputTokens'>>;
    }) => {
      const row: AiMessageRow = {
        id: randomUUID(),
        provider: null,
        model: null,
        inputTokens: null,
        outputTokens: null,
        createdAt: new Date(),
        ...data,
      };
      this.aiMessages.push(row);
      return row;
    },
  };

  readonly aiRecommendation = {
    findMany: async ({ where }: { where: { conversationId: string }; orderBy?: unknown }) =>
      this.aiRecommendations
        .filter((row) => row.conversationId === where.conversationId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
    create: async ({ data }: { data: Omit<AiRecommendationRow, 'id' | 'createdAt'> }) => {
      const row: AiRecommendationRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.aiRecommendations.push(row);
      return row;
    },
  };

  readonly productContentSuggestion = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.productContentSuggestions.find((row) => row.id === where.id) ?? null,
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { productId?: string; conversationId?: string; status?: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
    }) =>
      this.productContentSuggestions
        .filter(
          (row) =>
            (where.productId === undefined || row.productId === where.productId) &&
            (where.conversationId === undefined || row.conversationId === where.conversationId) &&
            (where.status === undefined || row.status === where.status),
        )
        .sort((a, b) =>
          orderBy?.createdAt === 'desc'
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime(),
        ),
    create: async ({
      data,
    }: {
      data: Omit<ProductContentSuggestionRow, 'id' | 'status' | 'createdAt'> & {
        status?: ProductContentSuggestionRow['status'];
      };
    }) => {
      const row: ProductContentSuggestionRow = {
        id: randomUUID(),
        status: data.status ?? 'PENDING',
        createdAt: new Date(),
        ...data,
      };
      this.productContentSuggestions.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<ProductContentSuggestionRow>;
    }) => {
      const row = this.productContentSuggestions.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Suggestion not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly order = {
    findFirst: async ({ where }: { where: { userId: string; idempotencyKey?: string } }) =>
      this.orders.find(
        (row) =>
          row.userId === where.userId &&
          (where.idempotencyKey === undefined || row.idempotencyKey === where.idempotencyKey),
      ) ?? null,
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: {
        items?: boolean;
        payments?: { orderBy?: { createdAt: 'asc' | 'desc' } };
        invoice?: boolean;
        subscription?: boolean;
      };
    }) => {
      const row = this.orders.find((entry) => entry.id === where.id) ?? null;
      if (!row) {
        return null;
      }
      return this.withOrderIncludes(row, include);
    },
    findUniqueOrThrow: async (args: {
      where: { id: string };
      include?: {
        items?: boolean;
        payments?: { orderBy?: { createdAt: 'asc' | 'desc' } };
        invoice?: boolean;
        subscription?: boolean;
      };
    }) => {
      const row = await this.order.findUnique(args);
      if (!row) {
        throw new Error('Order not found');
      }
      return row;
    },
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where: { userId: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
      include?: { items?: boolean };
    }) => {
      const rows = this.orders
        .filter((row) => row.userId === where.userId)
        .sort((a, b) =>
          orderBy?.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
      if (include?.items) {
        return rows.map((row) => ({
          ...row,
          items: this.orderItems.filter((item) => item.orderId === row.id),
        }));
      }
      return rows;
    },
    create: async ({
      data,
    }: {
      data: {
        userId: string;
        totalCents: number;
        currency: string;
        idempotencyKey?: string | null;
        items?: {
          create: Omit<OrderItemRow, 'id' | 'orderId' | 'quantity' | 'createdAt'> & {
            quantity?: number;
          };
        };
      };
    }) => {
      const row: OrderRow = {
        id: randomUUID(),
        userId: data.userId,
        status: 'PENDING',
        totalCents: data.totalCents,
        currency: data.currency,
        idempotencyKey: data.idempotencyKey ?? null,
        provider: null,
        providerSessionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.orders.push(row);
      if (data.items?.create) {
        this.orderItems.push({
          id: randomUUID(),
          orderId: row.id,
          quantity: data.items.create.quantity ?? 1,
          createdAt: new Date(),
          ...data.items.create,
        });
      }
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<OrderRow> }) => {
      const row = this.orders.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Order not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    count: async ({ where }: { where?: { status?: string } } = {}) =>
      this.orders.filter((row) => where?.status === undefined || row.status === where.status).length,
    aggregate: async ({
      where,
      _sum,
    }: {
      where?: { status?: string };
      _sum?: { totalCents?: boolean };
    }) => {
      const rows = this.orders.filter(
        (row) => where?.status === undefined || row.status === where.status,
      );
      return {
        _sum: {
          totalCents: _sum?.totalCents ? rows.reduce((sum, row) => sum + row.totalCents, 0) : 0,
        },
      };
    },
  };

  readonly orderItem = {
    findFirst: async ({
      where,
    }: {
      where: {
        productId: string;
        order?: { userId: string; status: string };
      };
    }) => {
      return (
        this.orderItems.find((item) => {
          if (item.productId !== where.productId) {
            return false;
          }
          if (!where.order) {
            return true;
          }
          const order = this.orders.find((entry) => entry.id === item.orderId);
          return (
            order !== undefined &&
            order.userId === where.order.userId &&
            order.status === where.order.status
          );
        }) ?? null
      );
    },
  };

  readonly payment = {
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { provider_providerPaymentId: { provider: string; providerPaymentId: string } };
      create: Omit<PaymentRow, 'id' | 'createdAt' | 'updatedAt'>;
      update: Partial<PaymentRow>;
    }) => {
      const existing = this.payments.find(
        (row) =>
          row.provider === where.provider_providerPaymentId.provider &&
          row.providerPaymentId === where.provider_providerPaymentId.providerPaymentId,
      );
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }
      const row: PaymentRow = {
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
      this.payments.push(row);
      return row;
    },
  };

  readonly paymentWebhookEvent = {
    findUnique: async ({
      where,
    }: {
      where: { provider_eventId: { provider: string; eventId: string } };
    }) =>
      this.paymentWebhookEvents.find(
        (row) =>
          row.provider === where.provider_eventId.provider &&
          row.eventId === where.provider_eventId.eventId,
      ) ?? null,
    create: async ({
      data,
    }: {
      data: Omit<PaymentWebhookEventRow, 'id' | 'status' | 'processedAt' | 'error' | 'createdAt'>;
    }) => {
      const row: PaymentWebhookEventRow = {
        id: randomUUID(),
        status: 'RECEIVED',
        processedAt: null,
        error: null,
        createdAt: new Date(),
        ...data,
      };
      this.paymentWebhookEvents.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<PaymentWebhookEventRow>;
    }) => {
      const row = this.paymentWebhookEvents.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Webhook event not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly subscription = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { product?: boolean; pricingPlan?: boolean };
    }) => {
      const row = this.subscriptions.find((entry) => entry.id === where.id) ?? null;
      if (!row) {
        return null;
      }
      if (include?.product || include?.pricingPlan) {
        const product = include.product
          ? this.products.find((entry) => entry.id === row.productId)
          : undefined;
        const pricingPlan = include.pricingPlan
          ? this.productPricingPlans.find((entry) => entry.id === row.pricingPlanId)
          : undefined;
        return { ...row, product, pricingPlan };
      }
      return row;
    },
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where: { userId: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
      include?: { product?: boolean; pricingPlan?: boolean };
    }) => {
      const rows = this.subscriptions
        .filter((row) => row.userId === where.userId)
        .sort((a, b) =>
          orderBy?.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
      return rows.map((row) => {
        const product = include?.product
          ? this.products.find((entry) => entry.id === row.productId)
          : undefined;
        const pricingPlan = include?.pricingPlan
          ? this.productPricingPlans.find((entry) => entry.id === row.pricingPlanId)
          : undefined;
        return { ...row, product, pricingPlan };
      });
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { orderId: string };
      create: Omit<SubscriptionRow, 'id' | 'createdAt' | 'updatedAt'>;
      update: Partial<SubscriptionRow>;
    }) => {
      const existing = this.subscriptions.find((row) => row.orderId === where.orderId);
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      }
      const row: SubscriptionRow = {
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...create,
      };
      this.subscriptions.push(row);
      return row;
    },
    update: async ({
      where,
      data,
      include,
    }: {
      where: { id: string };
      data: Partial<SubscriptionRow>;
      include?: { product?: boolean; pricingPlan?: boolean };
    }) => {
      const row = this.subscriptions.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Subscription not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      if (include?.product || include?.pricingPlan) {
        const product = include.product
          ? this.products.find((entry) => entry.id === row.productId)
          : undefined;
        const pricingPlan = include.pricingPlan
          ? this.productPricingPlans.find((entry) => entry.id === row.pricingPlanId)
          : undefined;
        return { ...row, product, pricingPlan };
      }
      return row;
    },
  };

  readonly invoice = {
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { orderId: string };
      create: Omit<InvoiceRow, 'id' | 'createdAt'>;
      update: Partial<InvoiceRow>;
    }) => {
      const existing = this.invoices.find((row) => row.orderId === where.orderId);
      if (existing) {
        Object.assign(existing, update);
        return existing;
      }
      const row: InvoiceRow = {
        id: randomUUID(),
        createdAt: new Date(),
        ...create,
      };
      this.invoices.push(row);
      return row;
    },
  };

  async $transaction<T>(callback: (tx: PrismaFake) => Promise<T>): Promise<T> {
    return callback(this);
  }

  private withOrderIncludes(
    row: OrderRow,
    include?: {
      items?: boolean;
      payments?: { orderBy?: { createdAt: 'asc' | 'desc' } };
      invoice?: boolean;
      subscription?: boolean;
    },
  ) {
    const result: Record<string, unknown> = { ...row };
    if (include?.items) {
      result.items = this.orderItems.filter((item) => item.orderId === row.id);
    }
    if (include?.payments) {
      result.payments = this.payments
        .filter((payment) => payment.orderId === row.id)
        .sort((a, b) =>
          include.payments?.orderBy?.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
    }
    if (include?.invoice) {
      result.invoice = this.invoices.find((invoice) => invoice.orderId === row.id) ?? null;
    }
    if (include?.subscription) {
      result.subscription = this.subscriptions.find((entry) => entry.orderId === row.id) ?? null;
    }
    return result;
  }

  readonly license = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { id?: string; orderId?: string };
      include?: {
        product?: boolean;
        pricingPlan?: boolean;
        seats?: boolean;
        activations?: boolean;
      };
    }) => {
      const row =
        this.licenses.find(
          (entry) =>
            (where.id !== undefined && entry.id === where.id) ||
            (where.orderId !== undefined && entry.orderId === where.orderId),
        ) ?? null;
      if (!row) {
        return null;
      }
      return this.withLicenseIncludes(row, include);
    },
    findFirst: async ({
      where,
    }: {
      where: { userId: string; productId: string; status: string };
    }) =>
      this.licenses.find(
        (entry) =>
          entry.userId === where.userId &&
          entry.productId === where.productId &&
          entry.status === where.status,
      ) ?? null,
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where: { userId?: string; seats?: { some: { assignedUserId: string } } };
      orderBy?: { createdAt: 'asc' | 'desc' };
      include?: {
        product?: boolean;
        pricingPlan?: boolean;
        seats?: boolean;
        activations?: boolean;
      };
    }) => {
      const rows = this.licenses
        .filter((row) => {
          if (where.userId !== undefined && row.userId === where.userId) {
            return true;
          }
          if (where.seats?.some.assignedUserId) {
            return this.licenseSeats.some(
              (seat) =>
                seat.licenseId === row.id &&
                seat.assignedUserId === where.seats!.some.assignedUserId,
            );
          }
          return where.userId === undefined && !where.seats;
        })
        .sort((a, b) =>
          orderBy?.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
      return rows.map((row) => this.withLicenseIncludes(row, include));
    },
    create: async ({
      data,
    }: {
      data: Omit<LicenseRow, 'id' | 'status' | 'createdAt' | 'updatedAt'> & {
        status?: LicenseRow['status'];
        seats?: {
          create: Omit<LicenseSeatRow, 'id' | 'licenseId' | 'createdAt'>;
        };
      };
    }) => {
      const row: LicenseRow = {
        id: randomUUID(),
        status: data.status ?? 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: data.userId,
        productId: data.productId,
        pricingPlanId: data.pricingPlanId,
        orderId: data.orderId,
        subscriptionId: data.subscriptionId,
        licenseKeyHash: data.licenseKeyHash,
        keyHint: data.keyHint,
        seatLimit: data.seatLimit,
        expiresAt: data.expiresAt,
      };
      this.licenses.push(row);
      if (data.seats?.create) {
        this.licenseSeats.push({
          id: randomUUID(),
          licenseId: row.id,
          createdAt: new Date(),
          ...data.seats.create,
        });
      }
      return row;
    },
  };

  readonly licenseSeat = {
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<LicenseSeatRow>;
    }) => {
      const row = this.licenseSeats.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Seat not found');
      }
      Object.assign(row, data);
      return row;
    },
    create: async ({
      data,
    }: {
      data: Omit<LicenseSeatRow, 'id' | 'createdAt'>;
    }) => {
      const row: LicenseSeatRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.licenseSeats.push(row);
      return row;
    },
  };

  readonly licenseActivation = {
    findMany: async ({ where }: { where: { licenseId: string } }) =>
      this.licenseActivations.filter((row) => row.licenseId === where.licenseId),
    create: async ({
      data,
    }: {
      data: Omit<LicenseActivationRow, 'id' | 'lastSeenAt' | 'revokedAt' | 'createdAt'>;
    }) => {
      const row: LicenseActivationRow = {
        id: randomUUID(),
        lastSeenAt: new Date(),
        revokedAt: null,
        createdAt: new Date(),
        ...data,
      };
      this.licenseActivations.push(row);
      return row;
    },
    update: async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<LicenseActivationRow>;
    }) => {
      const row = this.licenseActivations.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Activation not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  private withLicenseIncludes(
    row: LicenseRow,
    include?: {
      product?: boolean;
      pricingPlan?: boolean;
      seats?: boolean;
      activations?: boolean;
    },
  ) {
    const result: Record<string, unknown> = { ...row };
    if (include?.product) {
      result.product = this.products.find((entry) => entry.id === row.productId);
    }
    if (include?.pricingPlan) {
      result.pricingPlan = this.productPricingPlans.find((entry) => entry.id === row.pricingPlanId);
    }
    if (include?.seats) {
      result.seats = this.licenseSeats.filter((seat) => seat.licenseId === row.id);
    }
    if (include?.activations) {
      result.activations = this.licenseActivations.filter(
        (activation) => activation.licenseId === row.id,
      );
    }
    return result;
  }

  readonly review = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { id?: string; productId_userId?: { productId: string; userId: string } };
      include?: { user?: boolean; product?: boolean; replies?: { orderBy?: unknown; include?: { profile?: boolean } } };
    }) => {
      const row =
        this.reviews.find((entry) => {
          if (where.id !== undefined) {
            return entry.id === where.id;
          }
          if (where.productId_userId) {
            return (
              entry.productId === where.productId_userId.productId &&
              entry.userId === where.productId_userId.userId
            );
          }
          return false;
        }) ?? null;
      if (!row) {
        return null;
      }
      return this.withReviewIncludes(row, include);
    },
    findUniqueOrThrow: async (args: {
      where: { id?: string; productId_userId?: { productId: string; userId: string } };
      include?: { user?: boolean; product?: boolean; replies?: { orderBy?: unknown; include?: { profile?: boolean } } };
    }) => {
      const row = await this.review.findUnique(args);
      if (!row) {
        throw new Error('Review not found');
      }
      return row;
    },
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where: { productId?: string; status?: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
      include?: { user?: boolean; replies?: { orderBy?: unknown; include?: { profile?: boolean } } };
    }) => {
      const rows = this.reviews
        .filter(
          (row) =>
            (where.productId === undefined || row.productId === where.productId) &&
            (where.status === undefined || row.status === where.status),
        )
        .sort((a, b) =>
          orderBy?.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
      return rows.map((row) => this.withReviewIncludes(row, include));
    },
    create: async ({
      data,
      include,
    }: {
      data: Omit<ReviewRow, 'id' | 'status' | 'createdAt' | 'updatedAt'> & { status?: ReviewRow['status'] };
      include?: { user?: boolean; replies?: { include?: { profile?: boolean } } };
    }) => {
      const row: ReviewRow = {
        id: randomUUID(),
        status: data.status ?? 'PUBLISHED',
        createdAt: new Date(),
        updatedAt: new Date(),
        productId: data.productId,
        userId: data.userId,
        orderId: data.orderId,
        rating: data.rating,
        title: data.title,
        body: data.body,
        verifiedPurchase: data.verifiedPurchase,
      };
      this.reviews.push(row);
      return this.withReviewIncludes(row, include);
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<ReviewRow> }) => {
      const row = this.reviews.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Review not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
    count: async ({ where }: { where?: { status?: string } } = {}) =>
      this.reviews.filter((row) => where?.status === undefined || row.status === where.status).length,
  };

  readonly reviewReply = {
    create: async ({ data }: { data: Omit<ReviewReplyRow, 'id' | 'createdAt'> }) => {
      const row: ReviewReplyRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.reviewReplies.push(row);
      return row;
    },
  };

  readonly question = {
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { product?: boolean; user?: boolean; answers?: { orderBy?: unknown; include?: { user?: boolean } } };
    }) => {
      const row = this.questions.find((entry) => entry.id === where.id) ?? null;
      if (!row) {
        return null;
      }
      return this.withQuestionIncludes(row, include);
    },
    findUniqueOrThrow: async (args: {
      where: { id: string };
      include?: { product?: boolean; user?: boolean; answers?: { orderBy?: unknown; include?: { user?: boolean } } };
    }) => {
      const row = await this.question.findUnique(args);
      if (!row) {
        throw new Error('Question not found');
      }
      return row;
    },
    findMany: async ({
      where,
      orderBy,
      include,
    }: {
      where: { productId: string };
      orderBy?: { createdAt: 'asc' | 'desc' };
      include?: { user?: boolean; answers?: { orderBy?: unknown; include?: { user?: boolean } } };
    }) => {
      const rows = this.questions
        .filter((row) => row.productId === where.productId)
        .sort((a, b) =>
          orderBy?.createdAt === 'asc'
            ? a.createdAt.getTime() - b.createdAt.getTime()
            : b.createdAt.getTime() - a.createdAt.getTime(),
        );
      return rows.map((row) => this.withQuestionIncludes(row, include));
    },
    create: async ({
      data,
      include,
    }: {
      data: Omit<QuestionRow, 'id' | 'createdAt'>;
      include?: { user?: boolean; answers?: { include?: { user?: boolean } } };
    }) => {
      const row: QuestionRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.questions.push(row);
      return this.withQuestionIncludes(row, include);
    },
  };

  readonly answer = {
    create: async ({ data }: { data: Omit<AnswerRow, 'id' | 'createdAt'> }) => {
      const row: AnswerRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.answers.push(row);
      return row;
    },
  };

  readonly feedback = {
    create: async ({ data }: { data: Omit<FeedbackRow, 'id' | 'createdAt'> }) => {
      const row: FeedbackRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.feedbackRows.push(row);
      return row;
    },
  };

  readonly report = {
    create: async ({ data }: { data: Omit<ReportRow, 'id' | 'status' | 'createdAt' | 'updatedAt'> }) => {
      const row: ReportRow = {
        id: randomUUID(),
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      this.reports.push(row);
      return row;
    },
    findMany: async ({ orderBy }: { orderBy?: { createdAt: 'asc' | 'desc' } }) =>
      [...this.reports].sort((a, b) =>
        orderBy?.createdAt === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    update: async ({ where, data }: { where: { id: string }; data: Partial<ReportRow> }) => {
      const row = this.reports.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Report not found');
      }
      Object.assign(row, data, { updatedAt: new Date() });
      return row;
    },
  };

  readonly trustCheck = {
    findMany: async ({ orderBy }: { orderBy?: { createdAt: 'asc' | 'desc' } }) =>
      [...this.trustChecks].sort((a, b) =>
        orderBy?.createdAt === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.trustChecks.find((entry) => entry.id === where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<TrustCheckRow> }) => {
      const row = this.trustChecks.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Trust check not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly moderationCase = {
    findMany: async ({ orderBy }: { orderBy?: { createdAt: 'asc' | 'desc' } }) =>
      [...this.moderationCases].sort((a, b) =>
        orderBy?.createdAt === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    findUnique: async ({
      where,
      include,
    }: {
      where: { id: string };
      include?: { report?: boolean };
    }) => {
      const row = this.moderationCases.find((entry) => entry.id === where.id) ?? null;
      if (!row) {
        return null;
      }
      if (include?.report && row.reportId) {
        const report = this.reports.find((entry) => entry.id === row.reportId);
        return { ...row, report };
      }
      return row;
    },
    create: async ({ data }: { data: Omit<ModerationCaseRow, 'id' | 'status' | 'createdAt' | 'resolvedAt' | 'decision' | 'decidedByUserId' | 'decisionNote'> }) => {
      const row: ModerationCaseRow = {
        id: randomUUID(),
        status: 'OPEN',
        decision: null,
        decidedByUserId: null,
        decisionNote: null,
        resolvedAt: null,
        createdAt: new Date(),
        ...data,
      };
      this.moderationCases.push(row);
      return row;
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<ModerationCaseRow> }) => {
      const row = this.moderationCases.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Moderation case not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly dispute = {
    findMany: async ({ orderBy }: { orderBy?: { createdAt: 'asc' | 'desc' } }) =>
      [...this.disputes].sort((a, b) =>
        orderBy?.createdAt === 'asc'
          ? a.createdAt.getTime() - b.createdAt.getTime()
          : b.createdAt.getTime() - a.createdAt.getTime(),
      ),
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.disputes.find((entry) => entry.id === where.id) ?? null,
    update: async ({ where, data }: { where: { id: string }; data: Partial<DisputeRow> }) => {
      const row = this.disputes.find((entry) => entry.id === where.id);
      if (!row) {
        throw new Error('Dispute not found');
      }
      Object.assign(row, data);
      return row;
    },
  };

  readonly analyticsEvent = {
    create: async ({ data }: { data: Omit<AnalyticsEventRow, 'id' | 'createdAt'> }) => {
      const row: AnalyticsEventRow = { id: randomUUID(), createdAt: new Date(), ...data };
      this.analyticsEvents.push(row);
      return row;
    },
    count: async ({ where }: { where?: { name?: string } } = {}) =>
      this.analyticsEvents.filter((row) => where?.name === undefined || row.name === where.name)
        .length,
  };

  readonly productDailyMetric = {
    findMany: async ({
      where,
      orderBy,
      take,
    }: {
      where: { productId?: string | { in: string[] } };
      orderBy?: { date: 'asc' | 'desc' };
      take?: number;
    }) => {
      let rows = this.productDailyMetrics.filter((row) => {
        if (where.productId === undefined) {
          return true;
        }
        if (typeof where.productId === 'string') {
          return row.productId === where.productId;
        }
        return where.productId.in.includes(row.productId);
      });
      rows = rows.sort((a, b) =>
        orderBy?.date === 'asc'
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime(),
      );
      if (take !== undefined) {
        rows = rows.slice(0, take);
      }
      return rows;
    },
    aggregate: async ({
      where,
      _sum,
    }: {
      where: { productId: string };
      _sum?: {
        views?: boolean;
        favorites?: boolean;
        orders?: boolean;
        revenueCents?: boolean;
        reviews?: boolean;
      };
    }) => {
      const rows = this.productDailyMetrics.filter((row) => row.productId === where.productId);
      const sum = (field: keyof ProductDailyMetricRow) =>
        rows.reduce((total, row) => total + (row[field] as number), 0);
      return {
        _sum: {
          views: _sum?.views ? sum('views') : 0,
          favorites: _sum?.favorites ? sum('favorites') : 0,
          orders: _sum?.orders ? sum('orders') : 0,
          revenueCents: _sum?.revenueCents ? sum('revenueCents') : 0,
          reviews: _sum?.reviews ? sum('reviews') : 0,
        },
      };
    },
    upsert: async ({
      where,
      create,
      update,
    }: {
      where: { productId_date: { productId: string; date: Date } };
      create: Omit<ProductDailyMetricRow, 'id'>;
      update: Partial<Record<keyof ProductDailyMetricRow, { increment: number }>>;
    }) => {
      const existing = this.productDailyMetrics.find(
        (row) =>
          row.productId === where.productId_date.productId &&
          row.date.getTime() === where.productId_date.date.getTime(),
      );
      if (existing) {
        for (const [field, value] of Object.entries(update)) {
          if (value && 'increment' in value) {
            (existing as unknown as Record<string, number>)[field] += value.increment;
          }
        }
        return existing;
      }
      const row: ProductDailyMetricRow = { id: randomUUID(), ...create };
      this.productDailyMetrics.push(row);
      return row;
    },
  };

  private withReviewIncludes(
    row: ReviewRow,
    include?: {
      user?: boolean;
      product?: boolean;
      replies?: { orderBy?: unknown; include?: { profile?: boolean } };
    },
  ) {
    const result: Record<string, unknown> = { ...row };
    if (include?.user) {
      result.user = this.users.find((entry) => entry.id === row.userId);
    }
    if (include?.product) {
      result.product = this.products.find((entry) => entry.id === row.productId);
    }
    if (include?.replies) {
      result.replies = this.reviewReplies
        .filter((reply) => reply.reviewId === row.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((reply) => ({
          ...reply,
          profile: include.replies?.include?.profile
            ? this.developerProfiles.find((entry) => entry.id === reply.developerProfileId)
            : undefined,
        }));
    }
    return result;
  }

  private withQuestionIncludes(
    row: QuestionRow,
    include?: {
      product?: boolean;
      user?: boolean;
      answers?: { orderBy?: unknown; include?: { user?: boolean } };
    },
  ) {
    const result: Record<string, unknown> = { ...row };
    if (include?.product) {
      result.product = this.products.find((entry) => entry.id === row.productId);
    }
    if (include?.user) {
      result.user = this.users.find((entry) => entry.id === row.userId);
    }
    if (include?.answers) {
      result.answers = this.answers
        .filter((answer) => answer.questionId === row.id)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((answer) => ({
          ...answer,
          user: include.answers?.include?.user
            ? this.users.find((entry) => entry.id === answer.userId)
            : undefined,
        }));
    }
    return result;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
