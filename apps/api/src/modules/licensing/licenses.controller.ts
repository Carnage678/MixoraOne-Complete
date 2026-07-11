import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  ActivateLicenseResult,
  AssignLicenseSeatResult,
  LicenseActivationRecord,
  LicenseEntitlements,
  LicenseSeatRecord,
  LicenseSummary,
} from '@mixoraone/contracts';
import { IsEmail, IsOptional, IsString, IsUUID, Length } from 'class-validator';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { LicensingService } from './licensing.service';

class ActivateLicenseDto {
  @IsString()
  @Length(3, 120)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  deviceName?: string;
}

class DeactivateLicenseDto {
  @IsUUID()
  activationId!: string;
}

class AssignSeatDto {
  @IsEmail()
  email!: string;
}

@ApiTags('licenses')
@ApiBearerAuth()
@Controller('licenses')
export class LicensesController {
  constructor(private readonly licensing: LicensingService) {}

  @Get()
  @ApiOperation({ summary: 'List licenses you own or have a seat on' })
  list(@CurrentUser() principal: AuthPrincipal): Promise<LicenseSummary[]> {
    return this.licensing.listForUser(principal.userId);
  }

  @Get(':id/entitlements')
  @ApiOperation({ summary: 'Entitlement check for a license' })
  entitlements(
    @Param('id', ParseUUIDPipe) licenseId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<LicenseEntitlements> {
    return this.licensing.getEntitlements(licenseId, principal.userId);
  }

  @Get(':id/seats')
  @ApiOperation({ summary: 'List seat assignments (owner only)' })
  seats(
    @Param('id', ParseUUIDPipe) licenseId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<LicenseSeatRecord[]> {
    return this.licensing.listSeats(licenseId, principal.userId);
  }

  @Post(':id/seats')
  @ApiOperation({ summary: 'Assign a seat to another user by email' })
  assignSeat(
    @Param('id', ParseUUIDPipe) licenseId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: AssignSeatDto,
  ): Promise<AssignLicenseSeatResult> {
    return this.licensing.assignSeat(licenseId, principal.userId, dto.email);
  }

  @Get(':id/activations')
  @ApiOperation({ summary: 'List device activations visible to the caller' })
  activations(
    @Param('id', ParseUUIDPipe) licenseId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<LicenseActivationRecord[]> {
    return this.licensing.listActivations(licenseId, principal.userId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate the license on a device' })
  activate(
    @Param('id', ParseUUIDPipe) licenseId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: ActivateLicenseDto,
  ): Promise<ActivateLicenseResult> {
    return this.licensing.activate(
      licenseId,
      principal.userId,
      dto.deviceId,
      dto.deviceName,
    );
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Revoke a device activation' })
  async deactivate(
    @Param('id', ParseUUIDPipe) licenseId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: DeactivateLicenseDto,
  ): Promise<{ ok: true }> {
    await this.licensing.deactivate(licenseId, principal.userId, dto.activationId);
    return { ok: true };
  }
}
