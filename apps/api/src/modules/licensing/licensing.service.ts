import { createHash, randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ActivateLicenseResult,
  AssignLicenseSeatResult,
  GrantLicenseResult,
  LicenseActivationRecord,
  LicenseEntitlements,
  LicenseSeatRecord,
  LicenseSummary,
} from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

function hashSecret(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function generateLicenseKey(): string {
  return `mx_lic_${randomBytes(24).toString('hex')}`;
}

function generateActivationToken(): string {
  return `mx_act_${randomBytes(24).toString('hex')}`;
}

@Injectable()
export class LicensingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Idempotent grant when an order transitions to PAID. */
  async grantFromPaidOrder(orderId: string): Promise<GrantLicenseResult | null> {
    const existing = await this.prisma.license.findUnique({ where: { orderId } });
    if (existing) {
      return null;
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, subscription: true },
    });
    if (!order || order.status !== 'PAID') {
      return null;
    }
    const item = order.items[0];
    if (!item) {
      return null;
    }

    const plan = await this.prisma.productPricingPlan.findUnique({
      where: { id: item.pricingPlanId },
    });
    const licenseKey = generateLicenseKey();
    const license = await this.prisma.license.create({
      data: {
        userId: order.userId,
        productId: item.productId,
        pricingPlanId: item.pricingPlanId,
        orderId: order.id,
        subscriptionId: order.subscription?.id ?? null,
        licenseKeyHash: hashSecret(licenseKey),
        keyHint: licenseKey.slice(-8),
        seatLimit: plan?.seats ?? 1,
        expiresAt: order.subscription?.currentPeriodEnd ?? null,
        seats: {
          create: {
            assignedUserId: order.userId,
            assignedEmail: null,
            assignedAt: new Date(),
          },
        },
      },
    });

    await this.auditLog.record({
      action: 'license.granted',
      userId: order.userId,
      metadata: { licenseId: license.id, orderId, productId: item.productId },
    });

    return {
      licenseId: license.id,
      licenseKey,
      keyHint: license.keyHint,
    };
  }

  async listForUser(userId: string): Promise<LicenseSummary[]> {
    const [owned, seated] = await Promise.all([
      this.prisma.license.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { product: true, pricingPlan: true, seats: true, activations: true },
      }),
      this.prisma.license.findMany({
        where: { seats: { some: { assignedUserId: userId } } },
        orderBy: { createdAt: 'desc' },
        include: { product: true, pricingPlan: true, seats: true, activations: true },
      }),
    ]);

    const byId = new Map<string, (typeof owned)[number]>();
    for (const license of [...owned, ...seated]) {
      byId.set(license.id, license);
    }

    return Array.from(byId.values()).map((license) => this.toSummary(license, userId));
  }

  async getEntitlements(licenseId: string, userId: string): Promise<LicenseEntitlements> {
    const license = await this.requireAccessibleLicense(licenseId, userId);
    const valid = this.isLicenseValid(license);
    return {
      licenseId: license.id,
      status: license.status as LicenseEntitlements['status'],
      valid,
      productId: license.productId,
      productName: license.product.name,
      seatLimit: license.seatLimit,
      seatsAssigned: license.seats.filter((seat) => seat.assignedUserId || seat.assignedEmail)
        .length,
      activeActivations: license.activations.filter((activation) => !activation.revokedAt).length,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      features: valid ? ['access', 'updates', 'support'] : [],
    };
  }

  async listSeats(licenseId: string, userId: string): Promise<LicenseSeatRecord[]> {
    const license = await this.requireOwnedLicense(licenseId, userId);
    return license.seats.map((seat) => this.toSeatRecord(seat, license.activations));
  }

  async assignSeat(
    licenseId: string,
    userId: string,
    email: string,
  ): Promise<AssignLicenseSeatResult> {
    const license = await this.requireOwnedLicense(licenseId, userId);
    const normalizedEmail = email.trim().toLowerCase();
    const assignee = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!assignee) {
      throw new BadRequestException('No MixoraOne account exists for that email');
    }
    if (assignee.id === license.userId) {
      throw new BadRequestException('The license owner already has a seat');
    }

    const assignedCount = license.seats.filter(
      (seat) => seat.assignedUserId || seat.assignedEmail,
    ).length;
    if (assignedCount >= license.seatLimit) {
      throw new BadRequestException('All seats for this license are already assigned');
    }

    const existing = license.seats.find((seat) => seat.assignedUserId === assignee.id);
    if (existing) {
      throw new BadRequestException('This user already has a seat on the license');
    }

    const emptySeat = license.seats.find((seat) => !seat.assignedUserId && !seat.assignedEmail);
    const seat = emptySeat
      ? await this.prisma.licenseSeat.update({
          where: { id: emptySeat.id },
          data: {
            assignedUserId: assignee.id,
            assignedEmail: normalizedEmail,
            assignedAt: new Date(),
          },
        })
      : await this.prisma.licenseSeat.create({
          data: {
            licenseId,
            assignedUserId: assignee.id,
            assignedEmail: normalizedEmail,
            assignedAt: new Date(),
          },
        });

    await this.auditLog.record({
      action: 'license.seat_assigned',
      userId,
      metadata: { licenseId, seatId: seat.id, assigneeUserId: assignee.id },
    });

    const activations = await this.prisma.licenseActivation.findMany({ where: { licenseId } });
    return { seat: this.toSeatRecord(seat, activations) };
  }

  async activate(
    licenseId: string,
    userId: string,
    deviceId: string,
    deviceName?: string,
  ): Promise<ActivateLicenseResult> {
    const license = await this.requireAccessibleLicense(licenseId, userId);
    if (!this.isLicenseValid(license)) {
      throw new BadRequestException('This license is not currently valid');
    }

    const seat = license.seats.find((entry) => entry.assignedUserId === userId);
    if (!seat && license.userId !== userId) {
      throw new ForbiddenException('You do not have a seat on this license');
    }

    const activeCount = license.activations.filter((activation) => !activation.revokedAt).length;
    if (activeCount >= license.seatLimit) {
      throw new BadRequestException('Activation limit reached for this license');
    }

    const existing = license.activations.find(
      (activation) =>
        activation.userId === userId && activation.deviceId === deviceId && !activation.revokedAt,
    );
    if (existing) {
      await this.prisma.licenseActivation.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date(), deviceName: deviceName ?? existing.deviceName },
      });
      throw new BadRequestException('This device is already activated');
    }

    const activationToken = generateActivationToken();
    const activation = await this.prisma.licenseActivation.create({
      data: {
        licenseId,
        seatId: seat?.id ?? null,
        userId,
        deviceId,
        deviceName: deviceName ?? null,
        activationTokenHash: hashSecret(activationToken),
      },
    });

    await this.auditLog.record({
      action: 'license.activated',
      userId,
      metadata: { licenseId, activationId: activation.id, deviceId },
    });

    return {
      activationId: activation.id,
      activationToken,
      expiresAt: license.expiresAt?.toISOString() ?? null,
    };
  }

  async deactivate(licenseId: string, userId: string, activationId: string): Promise<void> {
    const license = await this.requireAccessibleLicense(licenseId, userId);
    const activation = license.activations.find((entry) => entry.id === activationId);
    if (!activation) {
      throw new NotFoundException('Activation not found');
    }
    if (activation.userId !== userId && license.userId !== userId) {
      throw new ForbiddenException('You cannot deactivate this activation');
    }
    if (activation.revokedAt) {
      return;
    }

    await this.prisma.licenseActivation.update({
      where: { id: activationId },
      data: { revokedAt: new Date() },
    });
    await this.auditLog.record({
      action: 'license.deactivated',
      userId,
      metadata: { licenseId, activationId },
    });
  }

  async listActivations(licenseId: string, userId: string): Promise<LicenseActivationRecord[]> {
    const license = await this.requireAccessibleLicense(licenseId, userId);
    return license.activations
      .filter((activation) => activation.userId === userId || license.userId === userId)
      .map((activation) => ({
        id: activation.id,
        deviceId: activation.deviceId,
        deviceName: activation.deviceName,
        lastSeenAt: activation.lastSeenAt.toISOString(),
        revokedAt: activation.revokedAt?.toISOString() ?? null,
        createdAt: activation.createdAt.toISOString(),
      }));
  }

  private async requireOwnedLicense(licenseId: string, userId: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: { product: true, pricingPlan: true, seats: true, activations: true },
    });
    if (!license) {
      throw new NotFoundException('License not found');
    }
    if (license.userId !== userId) {
      throw new ForbiddenException('Only the license owner can manage seats');
    }
    return license;
  }

  private async requireAccessibleLicense(licenseId: string, userId: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: { product: true, pricingPlan: true, seats: true, activations: true },
    });
    if (!license) {
      throw new NotFoundException('License not found');
    }
    const hasSeat = license.seats.some((seat) => seat.assignedUserId === userId);
    if (license.userId !== userId && !hasSeat) {
      throw new ForbiddenException('You do not have access to this license');
    }
    return license;
  }

  private isLicenseValid(license: {
    status: string;
    expiresAt: Date | null;
  }): boolean {
    if (license.status !== 'ACTIVE') {
      return false;
    }
    if (license.expiresAt && license.expiresAt.getTime() < Date.now()) {
      return false;
    }
    return true;
  }

  private toSummary(
    license: {
      id: string;
      userId: string;
      productId: string;
      status: string;
      keyHint: string;
      seatLimit: number;
      expiresAt: Date | null;
      createdAt: Date;
      product: { name: string };
      pricingPlan: { name: string };
      seats: Array<{ assignedUserId: string | null; assignedEmail: string | null }>;
      activations: Array<{ revokedAt: Date | null }>;
    },
    viewerUserId: string,
  ): LicenseSummary {
    return {
      id: license.id,
      productId: license.productId,
      productName: license.product.name,
      planName: license.pricingPlan.name,
      status: license.status as LicenseSummary['status'],
      keyHint: license.keyHint,
      seatLimit: license.seatLimit,
      seatsAssigned: license.seats.filter((seat) => seat.assignedUserId || seat.assignedEmail)
        .length,
      activeActivations: license.activations.filter((activation) => !activation.revokedAt).length,
      expiresAt: license.expiresAt?.toISOString() ?? null,
      createdAt: license.createdAt.toISOString(),
      isOwner: license.userId === viewerUserId,
    };
  }

  private toSeatRecord(
    seat: {
      id: string;
      assignedUserId: string | null;
      assignedEmail: string | null;
      assignedAt: Date | null;
    },
    activations: Array<{ seatId: string | null; revokedAt: Date | null }>,
  ): LicenseSeatRecord {
    return {
      id: seat.id,
      assignedUserId: seat.assignedUserId,
      assignedEmail: seat.assignedEmail,
      assignedAt: seat.assignedAt?.toISOString() ?? null,
      activeActivations: activations.filter(
        (activation) => activation.seatId === seat.id && !activation.revokedAt,
      ).length,
    };
  }
}
