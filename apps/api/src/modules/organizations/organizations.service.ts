import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Organization, OrganizationMember, OrganizationRole } from '@mixoraone/contracts';

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
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(userId: string, name: string): Promise<Organization> {
    const base = slugify(name);
    if (!base) {
      throw new BadRequestException('Organization name must contain letters or numbers');
    }
    const slug = await this.availableSlug(base);

    const organization = await this.prisma.organization.create({
      data: {
        name: name.trim(),
        slug,
        members: { create: { userId, role: 'OWNER' } },
      },
    });
    await this.auditLog.record({
      action: 'organization.created',
      userId,
      metadata: { organizationId: organization.id, slug },
    });

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt.toISOString(),
      myRole: 'OWNER',
      memberCount: 1,
    };
  }

  async listForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: { include: { _count: { select: { members: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      createdAt: membership.organization.createdAt.toISOString(),
      myRole: membership.role as OrganizationRole,
      memberCount: membership.organization._count.members,
    }));
  }

  async listMembers(organizationId: string, requesterId: string): Promise<OrganizationMember[]> {
    await this.requireMembership(organizationId, requesterId);
    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      role: member.role as OrganizationRole,
      joinedAt: member.createdAt.toISOString(),
    }));
  }

  /**
   * Members are added directly by email for now; invitation emails with
   * accept/decline arrive with the notifications epic.
   */
  async addMember(
    organizationId: string,
    requesterId: string,
    input: { email: string; role?: OrganizationRole },
  ): Promise<OrganizationMember> {
    await this.requireRole(organizationId, requesterId, 'OWNER');

    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });
    if (!user) {
      throw new NotFoundException('No MixoraOne account exists for this email');
    }

    const existing = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException('User is already a member of this organization');
    }

    const member = await this.prisma.organizationMember.create({
      data: { organizationId, userId: user.id, role: input.role ?? 'MEMBER' },
    });
    await this.auditLog.record({
      action: 'organization.member_added',
      userId: requesterId,
      metadata: { organizationId, memberUserId: user.id, role: member.role },
    });

    return {
      id: member.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: member.role as OrganizationRole,
      joinedAt: member.createdAt.toISOString(),
    };
  }

  async removeMember(
    organizationId: string,
    requesterId: string,
    memberUserId: string,
  ): Promise<void> {
    // Owners manage the roster; members may remove themselves (leave).
    if (requesterId !== memberUserId) {
      await this.requireRole(organizationId, requesterId, 'OWNER');
    }
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId: memberUserId } },
    });
    if (!membership) {
      throw new NotFoundException('Membership not found');
    }
    if (
      membership.role === 'OWNER' &&
      !(await this.hasAnotherOwner(organizationId, memberUserId))
    ) {
      throw new BadRequestException(
        'Transfer ownership before removing the last owner of an organization',
      );
    }

    await this.prisma.organizationMember.delete({ where: { id: membership.id } });
    await this.auditLog.record({
      action: 'organization.member_removed',
      userId: requesterId,
      metadata: { organizationId, memberUserId },
    });
  }

  private async availableSlug(base: string): Promise<string> {
    const existing = await this.prisma.organization.findUnique({ where: { slug: base } });
    if (!existing) {
      return base;
    }
    return `${base}-${randomBytes(3).toString('hex')}`;
  }

  private async requireMembership(organizationId: string, userId: string) {
    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }
    return membership;
  }

  private async requireRole(organizationId: string, userId: string, role: OrganizationRole) {
    const membership = await this.requireMembership(organizationId, userId);
    if (membership.role !== role) {
      throw new ForbiddenException(`Requires organization ${role.toLowerCase()} role`);
    }
    return membership;
  }

  private async hasAnotherOwner(organizationId: string, excludeUserId: string): Promise<boolean> {
    const owner = await this.prisma.organizationMember.findFirst({
      where: { organizationId, role: 'OWNER', userId: { not: excludeUserId } },
    });
    return owner !== null;
  }
}
