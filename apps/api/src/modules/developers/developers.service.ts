import { randomBytes } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateDeveloperProfileInput,
  DeveloperProfile,
  PublicDeveloperProfile,
  SubmitVerificationInput,
  UpdateDeveloperProfileInput,
  VerificationStatus,
} from '@mixoraone/contracts';

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

interface ProfileRecord {
  id: string;
  slug: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  skills: string[];
  verifiedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class DevelopersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Creating a developer profile upgrades the platform role to DEVELOPER. */
  async createOwnProfile(
    userId: string,
    input: CreateDeveloperProfileInput,
  ): Promise<DeveloperProfile> {
    const existing = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (existing) {
      throw new ConflictException('You already have a developer profile');
    }

    const base = slugify(input.displayName);
    if (!base) {
      throw new BadRequestException('Display name must contain letters or numbers');
    }
    const slug = await this.availableSlug(base);

    const profile = await this.prisma.developerProfile.create({
      data: {
        userId,
        slug,
        displayName: input.displayName.trim(),
        headline: input.headline ?? null,
        bio: input.bio ?? null,
        websiteUrl: input.websiteUrl ?? null,
        githubUrl: input.githubUrl ?? null,
        skills: input.skills ?? [],
      },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && user.role === 'USER') {
      await this.prisma.user.update({ where: { id: userId }, data: { role: 'DEVELOPER' } });
      await this.auditLog.record({
        action: 'user.role_upgraded',
        userId,
        metadata: { from: 'USER', to: 'DEVELOPER' },
      });
    }
    await this.auditLog.record({
      action: 'developer.profile_created',
      userId,
      metadata: { profileId: profile.id, slug },
    });

    return this.toOwnerView(profile, null);
  }

  async updateOwnProfile(
    userId: string,
    input: UpdateDeveloperProfileInput,
  ): Promise<DeveloperProfile> {
    const existing = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundException('Create a developer profile first');
    }

    const profile = await this.prisma.developerProfile.update({
      where: { id: existing.id },
      data: {
        ...(input.displayName !== undefined ? { displayName: input.displayName.trim() } : {}),
        ...(input.headline !== undefined ? { headline: input.headline || null } : {}),
        ...(input.bio !== undefined ? { bio: input.bio || null } : {}),
        ...(input.websiteUrl !== undefined ? { websiteUrl: input.websiteUrl || null } : {}),
        ...(input.githubUrl !== undefined ? { githubUrl: input.githubUrl || null } : {}),
        ...(input.skills !== undefined ? { skills: input.skills } : {}),
      },
    });
    await this.auditLog.record({
      action: 'developer.profile_updated',
      userId,
      metadata: { profileId: profile.id },
    });

    return this.toOwnerView(profile, await this.latestVerification(profile.id));
  }

  async getOwnProfile(userId: string): Promise<DeveloperProfile> {
    const profile = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('No developer profile yet');
    }
    return this.toOwnerView(profile, await this.latestVerification(profile.id));
  }

  async getPublicBySlug(slug: string): Promise<PublicDeveloperProfile> {
    const profile = await this.prisma.developerProfile.findUnique({ where: { slug } });
    if (!profile) {
      throw new NotFoundException('Developer not found');
    }
    return this.toPublicView(profile);
  }

  /** One pending submission at a time; approved profiles cannot resubmit. */
  async submitVerification(userId: string, input: SubmitVerificationInput): Promise<void> {
    const profile = await this.prisma.developerProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Create a developer profile first');
    }
    if (profile.verifiedAt) {
      throw new ConflictException('This developer profile is already verified');
    }
    const pending = await this.prisma.developerVerification.findFirst({
      where: { profileId: profile.id, status: 'PENDING' },
    });
    if (pending) {
      throw new ConflictException('A verification request is already under review');
    }

    await this.prisma.developerVerification.create({
      data: {
        profileId: profile.id,
        legalName: input.legalName.trim(),
        country: input.country.trim(),
        websiteUrl: input.websiteUrl ?? null,
        evidenceUrl: input.evidenceUrl ?? null,
        note: input.note ?? null,
      },
    });
    await this.auditLog.record({
      action: 'developer.verification_submitted',
      userId,
      metadata: { profileId: profile.id },
    });
  }

  private async latestVerification(profileId: string) {
    return this.prisma.developerVerification.findFirst({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async availableSlug(base: string): Promise<string> {
    const existing = await this.prisma.developerProfile.findUnique({ where: { slug: base } });
    if (!existing) {
      return base;
    }
    return `${base}-${randomBytes(3).toString('hex')}`;
  }

  private toPublicView(profile: ProfileRecord): PublicDeveloperProfile {
    return {
      slug: profile.slug,
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      websiteUrl: profile.websiteUrl,
      githubUrl: profile.githubUrl,
      skills: profile.skills,
      verified: profile.verifiedAt !== null,
      memberSince: profile.createdAt.toISOString(),
    };
  }

  private toOwnerView(
    profile: ProfileRecord,
    verification: { status: string; decisionNote: string | null } | null,
  ): DeveloperProfile {
    return {
      ...this.toPublicView(profile),
      id: profile.id,
      verificationStatus: (verification?.status as VerificationStatus | undefined) ?? null,
      verificationNote: verification?.decisionNote ?? null,
    };
  }
}
