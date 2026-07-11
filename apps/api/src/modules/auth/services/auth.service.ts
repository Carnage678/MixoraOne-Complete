import { createHash, randomBytes } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuthUser, UserRole } from '@mixoraone/contracts';

import { AppConfigService } from '../../../core/config/app-config.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AuditLogService } from '../../audit/audit-log.service';
import type { RefreshContext } from './token.service';
import { IssuedTokens, TokenService } from './token.service';
import { PasswordService } from './password.service';

const EMAIL_VERIFICATION_TTL_HOURS = 48;

export interface AuthResult {
  user: AuthUser;
  tokens: IssuedTokens;
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly auditLog: AuditLogService,
    private readonly config: AppConfigService,
  ) {}

  async register(
    input: { email: string; password: string; name: string },
    context: RefreshContext,
  ): Promise<AuthResult> {
    const email = input.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name.trim(),
        passwordHash: await this.passwordService.hash(input.password),
      },
    });

    await this.createEmailVerification(user.id, email);
    await this.auditLog.record({ action: 'auth.register', userId: user.id, ...context });

    const tokens = await this.tokenService.issueSession(
      { id: user.id, email: user.email, role: user.role as UserRole },
      context,
    );
    return { user: this.toAuthUser(user), tokens };
  }

  async login(
    input: { email: string; password: string },
    context: RefreshContext,
  ): Promise<AuthResult> {
    const email = input.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Verify against a dummy hash when the user is unknown so response timing
    // does not reveal whether the email exists.
    const passwordOk = user?.passwordHash
      ? await this.passwordService.verify(user.passwordHash, input.password)
      : (await this.passwordService.hash('timing-equalizer')) && false;

    if (!user || !passwordOk) {
      await this.auditLog.record({ action: 'auth.login_failed', metadata: { email }, ...context });
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.auditLog.record({ action: 'auth.login', userId: user.id, ...context });
    const tokens = await this.tokenService.issueSession(
      { id: user.id, email: user.email, role: user.role as UserRole },
      context,
    );
    return { user: this.toAuthUser(user), tokens };
  }

  async refresh(plainRefreshToken: string, context: RefreshContext): Promise<AuthResult> {
    const { tokens, userId } = await this.tokenService.rotate(plainRefreshToken, context);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Account no longer exists');
    }
    return { user: this.toAuthUser(user), tokens };
  }

  async logout(plainRefreshToken: string, context: RefreshContext): Promise<void> {
    const userId = await this.tokenService.revokeByToken(plainRefreshToken);
    if (userId) {
      await this.auditLog.record({ action: 'auth.logout', userId, ...context });
    }
  }

  async getById(userId: string): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toAuthUser(user);
  }

  async verifyEmail(plainToken: string): Promise<AuthUser> {
    const tokenHash = createHash('sha256').update(plainToken).digest('hex');
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    const user = await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await this.auditLog.record({ action: 'auth.email_verified', userId: user.id });
    return this.toAuthUser(user);
  }

  private async createEmailVerification(userId: string, email: string): Promise<void> {
    const plainToken = randomBytes(32).toString('base64url');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: createHash('sha256').update(plainToken).digest('hex'),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000),
      },
    });

    // Email delivery arrives with the notifications epic; until then the
    // verification link is only logged outside production.
    if (!this.config.isProduction) {
      this.logger.log(
        `Email verification link for ${email}: ${this.config.webAppUrl}/verify-email?token=${plainToken}`,
      );
    }
  }

  private toAuthUser(user: UserRecord): AuthUser {
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
