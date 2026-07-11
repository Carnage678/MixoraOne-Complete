import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser, UserRole } from '@mixoraone/contracts';

import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async updateProfile(userId: string, changes: { name?: string }): Promise<AuthUser> {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const shouldRename = changes.name !== undefined && changes.name.trim() !== existing.name;
    const user = shouldRename
      ? await this.prisma.user.update({
          where: { id: userId },
          data: { name: changes.name!.trim() },
        })
      : existing;

    if (shouldRename) {
      await this.auditLog.record({ action: 'user.profile_updated', userId });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      emailVerified: user.emailVerifiedAt !== null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
